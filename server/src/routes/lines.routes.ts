import { Router } from 'express';
import prisma from '../prisma';
import { requireRole } from '../middleware/auth';
import { BadRequest, optionalPastDate, optionalString, requiredString, sendError } from '../lib/validate';
import { LINE_TYPES, lineType } from '../shared/lines';

// Lines, tubes and drains, with their care-bundle checks.
const router = Router();

const include = {
    insertedBy: { select: { id: true, name: true, role: true } },
    removedBy: { select: { id: true, name: true, role: true } },
    checks: {
        orderBy: { timestamp: 'desc' as const },
        take: 20,
        include: { user: { select: { id: true, name: true, role: true } } },
    },
};

// All devices for a patient: those in place first, then the removed ones.
router.get('/:patientId', async (req, res) => {
    try {
        const lines = await prisma.patientLine.findMany({
            where: { patientId: req.params.patientId },
            include,
            orderBy: [{ removedAt: { sort: 'desc', nulls: 'first' } }, { insertedAt: 'desc' }],
        });
        res.json(lines);
    } catch (error) {
        sendError(res, error, 'Failed to load lines');
    }
});

// Record a newly inserted device.
router.post('/', async (req, res) => {
    try {
        const patientId = requiredString(req.body.patientId, 'Patient');
        const type = requiredString(req.body.type, 'Type', 30);
        if (!LINE_TYPES.some(t => t.key === type)) throw new BadRequest('Unknown line type');
        const line = await prisma.patientLine.create({
            data: {
                patientId,
                type,
                site: optionalString(req.body.site, 'Site', 120),
                size: optionalString(req.body.size, 'Size', 60),
                notes: optionalString(req.body.notes, 'Notes', 1000),
                insertedAt: optionalPastDate(req.body.insertedAt, 'Insertion time') || new Date(),
                insertedById: req.user!.id,
            },
            include,
        });
        res.status(201).json(line);
    } catch (error) {
        sendError(res, error, 'Failed to record line');
    }
});

// Correct the details of a device.
router.patch('/:id', async (req, res) => {
    try {
        const existing = await prisma.patientLine.findUnique({ where: { id: req.params.id } });
        if (!existing) return res.status(404).json({ error: 'Line not found' });
        res.locals.auditPatientId = existing.patientId;
        const insertedAt = optionalPastDate(req.body.insertedAt, 'Insertion time');
        const line = await prisma.patientLine.update({
            where: { id: existing.id },
            data: {
                site: req.body.site !== undefined ? optionalString(req.body.site, 'Site', 120) : undefined,
                size: req.body.size !== undefined ? optionalString(req.body.size, 'Size', 60) : undefined,
                notes: req.body.notes !== undefined ? optionalString(req.body.notes, 'Notes', 1000) : undefined,
                insertedAt: insertedAt || undefined,
            },
            include,
        });
        res.json(line);
    } catch (error) {
        sendError(res, error, 'Failed to update line');
    }
});

// Mark a device as removed.
router.post('/:id/remove', async (req, res) => {
    try {
        const existing = await prisma.patientLine.findUnique({ where: { id: req.params.id } });
        if (!existing) return res.status(404).json({ error: 'Line not found' });
        res.locals.auditPatientId = existing.patientId;
        if (existing.removedAt) throw new BadRequest('This line is already recorded as removed');
        const removedAt = optionalPastDate(req.body.removedAt, 'Removal time') || new Date();
        if (removedAt.getTime() < existing.insertedAt.getTime()) throw new BadRequest('Removal cannot be before insertion');
        const line = await prisma.patientLine.update({
            where: { id: existing.id },
            data: {
                removedAt,
                removedById: req.user!.id,
                removalReason: optionalString(req.body.reason, 'Reason', 300),
            },
            include,
        });
        res.json(line);
    } catch (error) {
        sendError(res, error, 'Failed to record removal');
    }
});

// Save a completed care-bundle checklist for a device.
router.post('/:id/checks', async (req, res) => {
    try {
        const existing = await prisma.patientLine.findUnique({ where: { id: req.params.id } });
        if (!existing) return res.status(404).json({ error: 'Line not found' });
        res.locals.auditPatientId = existing.patientId;
        if (existing.removedAt) throw new BadRequest('This line has been removed');

        // Keep only the checklist items that belong to this kind of device.
        const allowed = lineType(existing.type).bundle.map(b => b.key);
        const given = (req.body.items && typeof req.body.items === 'object') ? req.body.items as Record<string, unknown> : {};
        const items: Record<string, boolean> = {};
        for (const key of allowed) items[key] = given[key] === true;

        await prisma.lineBundleCheck.create({
            data: {
                lineId: existing.id,
                userId: req.user!.id,
                items,
                notes: optionalString(req.body.notes, 'Notes', 500),
            },
        });
        const line = await prisma.patientLine.findUnique({ where: { id: existing.id }, include });
        res.status(201).json(line);
    } catch (error) {
        sendError(res, error, 'Failed to save checklist');
    }
});

// Remove an entry made by mistake.
router.delete('/:id', requireRole('SENIOR', 'RESIDENT'), async (req, res) => {
    try {
        const existing = await prisma.patientLine.findUnique({ where: { id: req.params.id } });
        if (!existing) return res.status(404).json({ error: 'Line not found' });
        res.locals.auditPatientId = existing.patientId;
        await prisma.patientLine.delete({ where: { id: existing.id } });
        res.json({ success: true });
    } catch (error) {
        sendError(res, error, 'Failed to delete line');
    }
});

export default router;
