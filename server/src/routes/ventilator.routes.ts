import { Router } from 'express';
import prisma from '../prisma';
import { optionalNumber, optionalPastDate, optionalString, requiredNumber, requiredString, sendError } from '../lib/validate';
import { VENT_LIMITS } from '../shared/ranges';

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
        const b = req.body || {};
        const setting = await prisma.ventilatorSetting.create({
            data: {
                patientId: requiredString(b.patientId, 'Patient'),
                userId: req.user!.id,
                mode: requiredString(b.mode, 'Mode', 40),
                rate: requiredNumber(b.rate, VENT_LIMITS.rate),
                fio2: requiredNumber(b.fio2, VENT_LIMITS.fio2),
                ie: optionalString(b.ie, 'I:E', 20) || '',
                ps: requiredNumber(b.ps, VENT_LIMITS.ps),
                vt: requiredNumber(b.vt, VENT_LIMITS.vt),
                peep: optionalNumber(b.peep, VENT_LIMITS.peep),
                plateau: optionalNumber(b.plateau, VENT_LIMITS.plateau),
                pao2: optionalNumber(b.pao2, VENT_LIMITS.pao2),
                timestamp: optionalPastDate(b.timestamp, 'Time') || new Date()
            }
        });

        res.status(201).json(setting);
    } catch (error) {
        sendError(res, error, 'Failed to record ventilator setting');
    }
});

export default router;
