
import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// Get I/O History
router.get('/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;
        const entries = await prisma.intakeOutput.findMany({
            where: { patientId },
            orderBy: { timestamp: 'desc' },
            include: { user: { select: { name: true } } }
        });
        res.json(entries);
    } catch (error) {
        console.error('Error fetching I/O:', error);
        res.status(500).json({ error: 'Failed to fetch I/O history' });
    }
});

// Record I/O
router.post('/', async (req, res) => {
    try {
        const { patientId, userId, shiftId, type, category, amount, notes } = req.body;

        // Add basic validation
        if (!amount || amount < 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        const entry = await prisma.intakeOutput.create({
            data: {
                patientId,
                userId,
                shiftId: shiftId || null,
                type,
                category,
                amount: Number(amount),
                notes
            },
            include: { user: { select: { name: true } } }
        });
        res.status(201).json(entry);
    } catch (error) {
        console.error('Error recording I/O:', error);
        res.status(500).json({ error: 'Failed to record I/O' });
    }
});

export default router;
