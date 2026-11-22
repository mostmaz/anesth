import { Router } from 'express';
import prisma from '../prisma';
import { requireRole } from '../middleware/auth';
import { BadRequest, oneOf, requiredString, sendError } from '../lib/validate';
import { apache2, sofa } from '../shared/scores';

// Severity scores (SOFA, APACHE II). The server recalculates every score from
// the submitted values, so a stored total always matches its inputs.
const router = Router();

const include = { author: { select: { id: true, name: true, role: true } } };

router.get('/:patientId', async (req, res) => {
    try {
        const where: any = { patientId: req.params.patientId };
        if (typeof req.query.type === 'string') where.type = req.query.type;
        const scores = await prisma.clinicalScore.findMany({ where, include, orderBy: { timestamp: 'desc' }, take: 100 });
        res.json(scores);
    } catch (error) {
        sendError(res, error, 'Failed to load scores');
    }
});

router.post('/', requireRole('SENIOR', 'RESIDENT'), async (req, res) => {
    try {
        const patientId = requiredString(req.body.patientId, 'Patient');
        const type = oneOf(req.body.type, 'Score type', ['SOFA', 'APACHE2'] as const);
        const inputs = req.body.inputs;
        if (!inputs || typeof inputs !== 'object' || Array.isArray(inputs)) throw new BadRequest('Score values are required');

        const result = type === 'SOFA' ? sofa(inputs) : apache2(inputs);
        const score = await prisma.clinicalScore.create({
            data: {
                patientId,
                authorId: req.user!.id,
                type,
                total: result.total,
                components: { ...result.components, missing: result.missing } as any,
                inputs: inputs as any,
            },
            include,
        });
        res.status(201).json(score);
    } catch (error) {
        sendError(res, error, 'Failed to save score');
    }
});

router.delete('/:id', requireRole('SENIOR', 'RESIDENT'), async (req, res) => {
    try {
        const existing = await prisma.clinicalScore.findUnique({ where: { id: req.params.id } });
        if (!existing) return res.status(404).json({ error: 'Score not found' });
        res.locals.auditPatientId = existing.patientId;
        await prisma.clinicalScore.delete({ where: { id: existing.id } });
        res.json({ success: true });
    } catch (error) {
        sendError(res, error, 'Failed to delete score');
    }
});

export default router;
