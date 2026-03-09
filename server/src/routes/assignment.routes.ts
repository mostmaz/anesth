
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

// Create assignment (Sign In)
router.post('/', async (req, res) => {
    try {
        const { patientId, userId } = req.body;

        // 1. Check if Nurse is already assigned to ANY patient (active, non-pending)
        const existingNurseAssignment = await prisma.patientAssignment.findFirst({
            where: { userId, isActive: true }
        });

        if (existingNurseAssignment) {
            return res.status(400).json({
                success: false,
                message: 'You are already signed in on another patient. Please sign out first.'
            });
        }

        // Removed pending delete logic because it is not supported in db fields

        // 3. Check if Patient already has an assigned nurse (active, non-pending)
        const existingPatientAssignments = await prisma.patientAssignment.findMany({
            where: { patientId, isActive: true }
        });

        if (existingPatientAssignments.length > 0) {
            // Check if the signing-in user is Senior or Resident (can self-assign directly)
            const userSigningIn = await prisma.user.findUnique({ where: { id: userId } });
            const { assignerId } = req.body;

            let isAuthorized = userSigningIn?.role === 'SENIOR' || userSigningIn?.role === 'RESIDENT';

            if (!isAuthorized && assignerId) {
                const assigner = await prisma.user.findUnique({ where: { id: assignerId } });
                isAuthorized = assigner?.role === 'SENIOR' || assigner?.role === 'RESIDENT';
            }

            if (!isAuthorized) {
                // Create a PENDING assignment request — nurse waits for approval
                const pending = await prisma.patientAssignment.create({
                    data: {
                        patientId,
                        userId,
                        isPending: true,
                        isActive: false
                    }
                });
                return res.status(202).json({
                    success: true,
                    pending: true,
                    data: pending,
                    message: 'Assignment request submitted. Waiting for senior/resident approval.'
                });
            }
        }

        // Direct assignment
        const assignment = await prisma.patientAssignment.create({
            data: {
                patientId,
                userId,
                isPending: false,
                isActive: true
            }
        });

        res.json({ success: true, pending: false, data: assignment });

    } catch (error) {
        console.error("Error creating assignment:", error);
        res.status(500).json({ success: false, message: 'Failed to assign nurse' });
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
