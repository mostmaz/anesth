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
