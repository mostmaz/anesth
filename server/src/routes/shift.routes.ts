
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
});

// GET staff on duty (Seniors + Active Nurses)
router.get('/staff-on-duty', async (req, res) => {
    try {
        // 1. Get active Seniors (Seniors with active shifts)
        const activeSeniorShifts = await prisma.shift.findMany({
            where: { isActive: true, user: { role: 'SENIOR' } },
            include: {
                user: { select: { id: true, name: true, role: true } }
            }
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

        // 3. Get active assignments
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
                assignment: assignment ? assignment.patient.name : 'Unassigned'
            };
        });

        const seniorsOnDuty = activeSeniorShifts.map(shift => ({
            ...shift.user,
            shiftType: shift.type
        }));

        res.json({
            seniors: seniorsOnDuty,
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

        // If the user is a SENIOR, end all other active SENIOR shifts to ensure exclusivity
        const userObj = await prisma.user.findUnique({ where: { id: userId } });
        if (userObj?.role === 'SENIOR') {
            await prisma.shift.updateMany({
                where: { isActive: true, user: { role: 'SENIOR' } },
                data: { isActive: false, endTime: new Date() }
            });
        }

        const shift = await prisma.shift.create({
            data: {
                userId,
                type,
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

        // Auto-unassign patient when shift ends
        await prisma.patientAssignment.updateMany({
            where: { userId: shift.userId, isActive: true },
            data: { isActive: false }
        });

        res.json(shift);
    } catch (error) {
        res.status(500).json({ error: 'Failed to end shift' });
    }
});

// POST force end all active shifts for everyone
router.post('/end-all', async (req, res) => {
    try {
        await prisma.shift.updateMany({
            where: { isActive: true },
            data: {
                endTime: new Date(),
                isActive: false
            }
        });

        // Also unassign all patients to clear the board
        await prisma.patientAssignment.updateMany({
            where: { isActive: true },
            data: { isActive: false }
        });

        res.json({ success: true, message: 'All shifts and assignments ended.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to end all shifts' });
    }
});

export default router;
