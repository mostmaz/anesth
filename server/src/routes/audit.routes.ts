import { Router } from 'express';
import prisma from '../prisma';
import { requireRole } from '../middleware/auth';
import { sendError } from '../lib/validate';

// Read access to the audit trail and the app error reports. Seniors only.
const router = Router();

router.get('/', requireRole('SENIOR'), async (req, res) => {
    try {
        const where: any = {};
        const { patientId, userId, q, from, to, before } = req.query;
        if (typeof patientId === 'string' && patientId) where.patientId = patientId;
        if (typeof userId === 'string' && userId) where.userId = userId;
        if (typeof q === 'string' && q.trim()) where.action = { contains: q.trim(), mode: 'insensitive' };
        const range: any = {};
        if (typeof from === 'string' && !isNaN(Date.parse(from))) range.gte = new Date(from);
        if (typeof to === 'string' && !isNaN(Date.parse(to))) range.lte = new Date(to);
        if (typeof before === 'string' && !isNaN(Date.parse(before))) range.lt = new Date(before);
        if (Object.keys(range).length) where.timestamp = range;

        const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit || '100'), 10) || 100));
        const rows = await prisma.auditLog.findMany({
            where,
            orderBy: { timestamp: 'desc' },
            take: limit,
            include: { user: { select: { id: true, name: true, username: true, role: true } } },
        });

        // Patient names for the rows shown.
        const ids = Array.from(new Set(rows.map(r => r.patientId).filter((x): x is string => !!x)));
        const patients = ids.length
            ? await prisma.patient.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, mrn: true } })
            : [];
        const byId = new Map(patients.map(p => [p.id, p]));

        res.json(rows.map(r => ({
            id: r.id,
            timestamp: r.timestamp,
            action: r.action,
            status: r.status,
            path: r.path,
            details: r.details,
            ip: r.ip,
            user: r.user,
            patient: r.patientId ? (byId.get(r.patientId) || { id: r.patientId, name: '(deleted patient)', mrn: '' }) : null,
        })));
    } catch (error) {
        sendError(res, error, 'Failed to load the audit log');
    }
});

router.get('/client-errors', requireRole('SENIOR'), async (_req, res) => {
    try {
        const rows = await prisma.clientError.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
        res.json(rows);
    } catch (error) {
        sendError(res, error, 'Failed to load error reports');
    }
});

export default router;
