import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// GET active shift for a user
router.get('/active/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const activeShift = await prisma.shift.findFirst({
            where: {
                userId,
                isActive: true
            },
            orderBy: {
                startTime: 'desc'
            }
        });
        res.json(activeShift);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch active shift' });
    }
}
});

// GET staff on duty (Seniors + Active Nurses)
router.get('/staff-on-duty', async (req, res) => {
    try {
        // 1. Get all Seniors (assuming they are always "On Call" or we can filter by shift if they track it)
        // For now, let's get all Seniors.
        const seniors = await prisma.user.findMany({
            where: { role: 'SENIOR' },
            select: { id: true, name: true, role: true }
        });

        // 2. Get active Nurses (those with active shifts)
        const activeSystemShifts = await prisma.shift.findMany({
            where: { isActive: true, user: { role: 'NURSE' } },
            include: {
                user: {
                    select: { id: true, name: true, role: true }
                }
            }
        });

        // 3. Get active assignments for these nurses to show where they are assigned
        // We can fetch all active assignments and map them
        const activeAssignments = await prisma.patientAssignment.findMany({
            where: { isActive: true },
            include: {
                patient: { select: { name: true, mrn: true } },
                user: { select: { id: true } }
            }
        });

        // Format the response
        const nursesOnDuty = activeSystemShifts.map(shift => {
            const assignment = activeAssignments.find(a => a.user.id === shift.user.id);
            return {
                ...shift.user,
                shiftType: shift.type,
                assignment: assignment ? assignment.patient.name : 'Unassigned' // or null
            };
        });

        res.json({
            seniors,
            nurses: nursesOnDuty
        });

    } catch (error) {
        console.error("Error fetching staff on duty:", error);
        res.status(500).json({ error: 'Failed to fetch staff on duty' });
    }
});


// POST start a new shift
router.post('/start', async (req, res) => {
    try {
        const { userId, type } = req.body; // 'DAY' or 'NIGHT'

        // Check if already active
        const existing = await prisma.shift.findFirst({
            where: { userId, isActive: true }
        });

        if (existing) {
            return res.status(400).json({ error: 'User already has an active shift' });
        }

        const shift = await prisma.shift.create({
            data: {
                userId,
                type, // Ensure this matches enum 'DAY' | 'NIGHT'
                startTime: new Date(),
                isActive: true
            }
        });
        res.json(shift);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to start shift' });
    }
});

// PATCH end a shift
router.patch('/:id/end', async (req, res) => {
    try {
        const { id } = req.params;
        const shift = await prisma.shift.update({
            where: { id },
            data: {
                endTime: new Date(),
                isActive: false
            }
        });
        res.json(shift);
    } catch (error) {
        res.status(500).json({ error: 'Failed to end shift' });
    }
});

export default router;
