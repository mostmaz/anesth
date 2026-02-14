import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// GET vitals for a patient
router.get('/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;
        const { startTime, endTime } = req.query;

        const where: any = { patientId };

        if (startTime || endTime) {
            where.timestamp = {};
            if (startTime) where.timestamp.gte = new Date(startTime as string);
            if (endTime) where.timestamp.lte = new Date(endTime as string);
        }

        const vitals = await prisma.vitalSign.findMany({
            where,
            orderBy: { timestamp: 'desc' }, // Get latest records first
            take: 200 // Allow more for reports
        });
        // Return in chronological order (Oldest -> Newest) for charts/reports
        res.json(vitals.reverse());
    } catch (error) {
        console.error("Error fetching vitals:", error);
        res.status(500).json({ error: 'Failed to fetch vitals' });
    }
});

// POST new vital sign
router.post('/', async (req, res) => {
    try {
        const { patientId, heartRate, bpSys, bpDia, spo2, temp } = req.body;
        const vital = await prisma.vitalSign.create({
            data: {
                patientId,
                heartRate: heartRate ? Number(heartRate) : null,
                bpSys: bpSys ? Number(bpSys) : null,
                bpDia: bpDia ? Number(bpDia) : null,
                spo2: spo2 ? Number(spo2) : null,
                temp: temp ? Number(temp) : null,
                rbs: req.body.rbs ? Number(req.body.rbs) : null,
                timestamp: new Date()
            }
        });
        res.status(201).json(vital);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to record vitals' });
    }
});

export default router;
