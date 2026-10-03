
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get active assignments
router.get('/active', async (req, res) => {
    try {
        const assignments = await prisma.patientAssignment.findMany({
            where: { isActive: true },
            include: {
                user: { select: { id: true, name: true, role: true } },
                patient: { select: { id: true, name: true, mrn: true } }
            }
        });
        res.json(assignments);
    } catch (error) {
        console.error("Error fetching assignments:", error);
        res.status(500).json({ error: 'Failed to fetch assignments' });
    }
});

// GET pending assignment requests (for Senior/Resident to approve)
router.get('/pending', async (req, res) => {
    try {
        const pending = await prisma.patientAssignment.findMany({
            where: {
                isPending: true,
                isActive: false
            },
            include: {
                user: { select: { id: true, name: true, role: true } },
                patient: { select: { id: true, name: true, mrn: true } }
            },
            orderBy: { createdAt: 'asc' }
        });
        res.json(pending);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch pending assignments' });
    }
});

// PATCH approve a pending assignment
router.patch('/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;
        const assignment = await prisma.patientAssignment.update({
            where: { id },
            data: { isPending: false, isActive: true }
        });
        res.json({ success: true, data: assignment });
    } catch (error) {
        res.status(500).json({ error: 'Failed to approve assignment' });
    }
});

// PATCH reject a pending assignment
router.patch('/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.patientAssignment.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to reject assignment' });
    }
});

// Check in a nurse to a patient. Checking in force-hands-over the patient:
// the incoming nurse's other assignments end, and any other nurse currently on
// this patient is checked out + signed out. No pending/approval step.
router.post('/', async (req, res) => {
    try {
        const { patientId, userId } = req.body;
        if (!patientId || !userId) {
            return res.status(400).json({ success: false, message: 'patientId and userId are required' });
        }

        // 1. A nurse holds one patient at a time — end their other active check-ins.
        await prisma.patientAssignment.updateMany({
            where: { userId, isActive: true, patientId: { not: patientId } },
            data: { isActive: false, isPending: false, endedAt: new Date() }
        });

        // 2. Check out (and sign out) any other nurse currently on this patient.
        const displaced = await prisma.patientAssignment.findMany({
            where: { patientId, isActive: true, userId: { not: userId } },
            include: { user: { select: { id: true, name: true } } }
        });
        if (displaced.length > 0) {
            await prisma.patientAssignment.updateMany({
                where: { patientId, isActive: true, userId: { not: userId } },
                data: { isActive: false, isPending: false, endedAt: new Date() }
            });
        }

        // 3. If already checked in here, reuse it; otherwise create the active check-in.
        const existing = await prisma.patientAssignment.findFirst({
            where: { patientId, userId, isActive: true }
        });
        const assignment = existing || await prisma.patientAssignment.create({
            data: { patientId, userId, isPending: false, isActive: true }
        });

        res.json({
            success: true,
            pending: false,
            data: assignment,
            displaced: displaced.map(d => d.user?.name).filter(Boolean),
        });

    } catch (error) {
        console.error("Error creating assignment:", error);
        res.status(500).json({ success: false, message: 'Failed to check in' });
    }
});

// End assignment (Sign Out)
router.post('/end', async (req, res) => {
    try {
        const { patientId, userId } = req.body;
        console.log(`[ASSIGNMENT] Ending assignment for user ${userId} on patient ${patientId}`);

        const result = await prisma.patientAssignment.updateMany({
            where: { patientId, userId, isActive: true },
            data: {
                endedAt: new Date(),
                isActive: false,
                isPending: false
            }
        });

        console.log(`[ASSIGNMENT] Ended ${result.count} assignments`);

        if (result.count === 0) {
            return res.status(404).json({ success: false, message: 'No active assignment found to end.' });
        }

        res.json({ success: true, message: 'Signed out successfully' });

    } catch (error) {
        console.error("Error ending assignment:", error);
        res.status(500).json({ success: false, message: 'Failed to sign out' });
    }
});

export default router;
