import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma';

// Audit trail: who changed what, for which patient, and when. It records the
// action and identifiers only — never the request body.

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function clip(value: unknown, max = 60): string | undefined {
    if (typeof value !== 'string' || !value) return undefined;
    return value.slice(0, max);
}

// Writes one audit row. Never throws: auditing must not break the request.
export function recordAudit(entry: {
    userId: string;
    action: string;
    method?: string;
    path?: string;
    status?: number;
    patientId?: string | null;
    ip?: string | null;
    details?: Record<string, unknown>;
}) {
    const details = entry.details && Object.keys(entry.details).length
        ? JSON.stringify(entry.details).slice(0, 1000)
        : null;
    prisma.auditLog.create({
        data: {
            userId: entry.userId,
            action: entry.action.slice(0, 120),
            method: entry.method,
            path: entry.path?.slice(0, 200),
            status: entry.status,
            patientId: entry.patientId || null,
            ip: entry.ip?.slice(0, 60) || null,
            details,
        },
    }).catch((e) => console.error('[AUDIT] write failed:', e?.message || e));
}

// Records every change made through the API (after it has been answered).
// Routes can add identifiers with res.locals.audit = { ... } and name the
// patient with res.locals.auditPatientId.
export function auditTrail(req: Request, res: Response, next: NextFunction) {
    if (!MUTATING.has(req.method)) return next();
    res.on('finish', () => {
        const user = req.user;
        if (!user || res.statusCode >= 500) return;
        // e.g. "/medications/administer" or "/patients/:id" (ids are not part of the action name).
        const route = (`${req.baseUrl || ''}${req.route?.path || ''}`.replace(/^\/api/, '').replace(/\/$/, '')) || req.originalUrl.split('?')[0].replace(/^\/api/, '');
        const body = (req.body && typeof req.body === 'object') ? req.body as Record<string, unknown> : {};
        const patientId = clip(res.locals.auditPatientId)
            || clip(body.patientId)
            || clip(req.params?.patientId)
            || (route.startsWith('/patients/:id') ? clip(req.params?.id) : undefined);
        recordAudit({
            userId: user.id,
            action: `${req.method} ${route}`,
            method: req.method,
            path: req.originalUrl.split('?')[0],
            status: res.statusCode,
            patientId,
            ip: req.ip,
            details: {
                ...(req.params?.id ? { id: clip(req.params.id) } : {}),
                ...(clip(body.medicationId) ? { medicationId: clip(body.medicationId) } : {}),
                ...(clip(body.type, 30) ? { type: clip(body.type, 30) } : {}),
                ...(clip(body.status, 30) ? { status: clip(body.status, 30) } : {}),
                ...(res.locals.audit || {}),
            },
        });
    });
    next();
}

// "Who opened this chart": one entry per user and patient every 15 minutes.
const VIEW_WINDOW_MS = 15 * 60_000;
const recentViews = new Map<string, number>();

export function recordPatientView(req: Request, patientId: string) {
    const user = req.user;
    if (!user) return;
    const key = `${user.id}|${patientId}`;
    const now = Date.now();
    const last = recentViews.get(key);
    if (last && now - last < VIEW_WINDOW_MS) return;
    recentViews.set(key, now);
    if (recentViews.size > 5000) {
        for (const [k, t] of recentViews) if (now - t >= VIEW_WINDOW_MS) recentViews.delete(k);
    }
    recordAudit({ userId: user.id, action: 'VIEW patient chart', method: 'GET', patientId, ip: req.ip });
}
