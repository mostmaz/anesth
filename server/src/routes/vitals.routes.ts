import { Router } from 'express';
import prisma from '../prisma';
import { BadRequest, optionalNumber, requiredString, sendError } from '../lib/validate';
import { PAIN_SCALES, VITAL_LIMITS, vitalsProblems } from '../shared/ranges';

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
            take: 200, // Allow more for reports
            include: { user: { select: { id: true, name: true, role: true } } }
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
        const b = { ...(req.body || {}) };
        const patientId = requiredString(b.patientId, 'Patient');

        // The apps have always sent 0 for an observation that was not taken, so 0
        // keeps meaning "not recorded" for these fields.
        for (const key of ['heartRate', 'bpSys', 'bpDia', 'spo2', 'temp', 'rr', 'rbs']) {
            if (b[key] === 0 || b[key] === '0') b[key] = null;
        }

        // Reject values that cannot be real (typing slips) before anything is saved.
        const problems = vitalsProblems(b);
        if (problems.length) throw new BadRequest(problems.join('. '));

        const intubated = b.gcsIntubated === true || b.gcsIntubated === 'true';
        const painScore = optionalNumber(b.painScore, PAIN_SCALES[String(b.painScale || 'NRS').toUpperCase()] || PAIN_SCALES.NRS);

        const vital = await prisma.vitalSign.create({
            data: {
                patientId,
                heartRate: optionalNumber(b.heartRate, VITAL_LIMITS.heartRate),
                bpSys: optionalNumber(b.bpSys, VITAL_LIMITS.bpSys),
                bpDia: optionalNumber(b.bpDia, VITAL_LIMITS.bpDia),
                spo2: optionalNumber(b.spo2, VITAL_LIMITS.spo2),
                temp: optionalNumber(b.temp, VITAL_LIMITS.temp),
                rbs: optionalNumber(b.rbs, VITAL_LIMITS.rbs),
                rr: optionalNumber(b.rr, VITAL_LIMITS.rr),
                gcsEye: optionalNumber(b.gcsEye, VITAL_LIMITS.gcsEye),
                gcsVerbal: intubated ? null : optionalNumber(b.gcsVerbal, VITAL_LIMITS.gcsVerbal),
                gcsMotor: optionalNumber(b.gcsMotor, VITAL_LIMITS.gcsMotor),
                gcsIntubated: intubated,
                rass: optionalNumber(b.rass, VITAL_LIMITS.rass),
                painScore,
                painScale: painScore === null ? null : String(b.painScale || 'NRS').toUpperCase(),
                imageUrl: typeof b.imageUrl === 'string' && b.imageUrl ? b.imageUrl : null,
                userId: req.user!.id,
                timestamp: new Date()
            },
            include: { user: { select: { id: true, name: true, role: true } } }
        });
        res.status(201).json(vital);
    } catch (error) {
        sendError(res, error, 'Failed to record vitals');
    }
});

export default router;
