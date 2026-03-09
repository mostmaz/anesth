import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// GET history for a patient
router.get('/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;
        const settings = await prisma.ventilatorSetting.findMany({
            where: { patientId },
            orderBy: { timestamp: 'desc' },
            take: 100
        });
        res.json(settings);
    } catch (error) {
        console.error("Error fetching ventilator settings:", error);
        res.status(500).json({ error: 'Failed to fetch ventilator settings' });
    }
});

// POST new setting
router.post('/', async (req, res) => {
    try {
        const { patientId, userId, mode, rate, fio2, ie, ps, vt, timestamp } = req.body;

        const setting = await prisma.ventilatorSetting.create({
            data: {
                patientId,
                userId,
                mode,
                rate: Number(rate),
                fio2: Number(fio2),
                ie,
                ps: Number(ps),
                vt: Number(vt),
                timestamp: timestamp ? new Date(timestamp) : new Date()
            }
        });

        res.status(201).json(setting);
    } catch (error) {
        console.error("Error recording ventilator setting:", error);
        res.status(500).json({ error: 'Failed to record ventilator setting' });
    }
});

export default router;
