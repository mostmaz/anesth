import { Router, Request } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../prisma';
import { BadRequest, oneOf, optionalString, requiredString, sendError } from '../lib/validate';

// Electronic end-of-shift MAR sign-off.
//
// The nurse reviews the administrations charted for the shift and confirms
// them by entering their own password. The confirmation stores a snapshot of
// those entries and a fingerprint of it, so a later change to the record for
// that period is visible. The printed MAR is not affected.
const router = Router();

const MAX_PERIOD_MS = 14 * 60 * 60 * 1000;

interface SnapshotItem {
    id: string;
    medicationId: string;
    drug: string;
    dose: string | null;
    route: string;
    status: string;
    timestamp: string;
    chartedAt: string | null;
    userId: string | null;
    by: string | null;
}

function period(startRaw: unknown, endRaw: unknown): { start: Date; end: Date } {
    const start = new Date(String(startRaw || ''));
    const end = new Date(String(endRaw || ''));
    if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new BadRequest('A valid start and end time are required');
    if (end.getTime() <= start.getTime()) throw new BadRequest('The period must end after it starts');
    if (end.getTime() - start.getTime() > MAX_PERIOD_MS) throw new BadRequest('A sign-off covers one shift at most');
    if (start.getTime() > Date.now()) throw new BadRequest('The period has not started yet');
    return { start, end };
}

// The administrations charted for the patient in the period, oldest first.
async function snapshot(patientId: string, start: Date, end: Date): Promise<SnapshotItem[]> {
    const until = new Date(Math.min(end.getTime(), Date.now()));
    const rows = await prisma.medicationAdministration.findMany({
        where: { patientId, timestamp: { gte: start, lt: until } },
        include: { medication: { select: { name: true, route: true } }, user: { select: { name: true } } },
        orderBy: [{ timestamp: 'asc' }, { id: 'asc' }],
    });
    return rows.map(r => ({
        id: r.id,
        medicationId: r.medicationId,
        drug: r.medication?.name || '',
        dose: r.dose,
        route: r.medication?.route || '',
        status: r.status,
        timestamp: r.timestamp.toISOString(),
        chartedAt: r.chartedAt ? r.chartedAt.toISOString() : null,
        userId: r.userId,
        by: r.user?.name || null,
    }));
}

// Fingerprint of what was reviewed: which entries, their drug, dose, status and time.
function fingerprint(items: SnapshotItem[]): string {
    const canonical = items.map(i => [i.id, i.medicationId, i.dose || '', i.status, i.timestamp, i.userId || '']);
    return crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

function counts(items: SnapshotItem[]) {
    const byStatus: Record<string, number> = {};
    for (const i of items) byStatus[i.status] = (byStatus[i.status] || 0) + 1;
    return { total: items.length, byStatus };
}

// Wrong-password attempts on the signature, per user.
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60_000;

function tooManyAttempts(userId: string): boolean {
    const a = attempts.get(userId);
    if (!a) return false;
    if (a.resetAt <= Date.now()) { attempts.delete(userId); return false; }
    return a.count >= MAX_ATTEMPTS;
}

function failedAttempt(userId: string) {
    const now = Date.now();
    const a = attempts.get(userId);
    if (!a || a.resetAt <= now) attempts.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    else a.count += 1;
}

// What the nurse is about to sign.
router.get('/:patientId/preview', async (req, res) => {
    try {
        const { start, end } = period(req.query.start, req.query.end);
        const items = await snapshot(req.params.patientId, start, end);
        res.json({ items, counts: counts(items), contentHash: fingerprint(items) });
    } catch (error) {
        sendError(res, error, 'Failed to prepare the sign-off');
    }
});

// Past sign-offs for a patient, newest first. `changedSince` is true when the
// MAR entries for that period no longer match what was signed.
router.get('/:patientId', async (req, res) => {
    try {
        const rows = await prisma.marSignOff.findMany({
            where: { patientId: req.params.patientId },
            include: { user: { select: { id: true, name: true, role: true } } },
            orderBy: { signedAt: 'desc' },
            take: 30,
        });
        const out = [];
        for (const row of rows) {
            const current = fingerprint(await snapshot(row.patientId, row.periodStart, row.periodEnd));
            const summary = row.summary as { counts?: unknown } | null;
            out.push({
                id: row.id,
                shiftType: row.shiftType,
                periodStart: row.periodStart,
                periodEnd: row.periodEnd,
                signedAt: row.signedAt,
                note: row.note,
                user: row.user,
                counts: summary?.counts ?? null,
                changedSince: current !== row.contentHash,
            });
        }
        res.json(out);
    } catch (error) {
        sendError(res, error, 'Failed to load sign-offs');
    }
});

// One sign-off with the full list that was confirmed.
router.get('/detail/:id', async (req, res) => {
    try {
        const row = await prisma.marSignOff.findUnique({
            where: { id: req.params.id },
            include: { user: { select: { id: true, name: true, role: true } } },
        });
        if (!row) return res.status(404).json({ error: 'Sign-off not found' });
        res.json(row);
    } catch (error) {
        sendError(res, error, 'Failed to load the sign-off');
    }
});

// Sign: the signer's password is the signature.
router.post('/', async (req: Request, res) => {
    try {
        const user = req.user!;
        const patientId = requiredString(req.body.patientId, 'Patient');
        const shiftType = oneOf(req.body.shiftType, 'Shift', ['DAY', 'NIGHT'] as const);
        const { start, end } = period(req.body.periodStart, req.body.periodEnd);
        const password = typeof req.body.password === 'string' ? req.body.password : '';
        if (!password) throw new BadRequest('Enter your password to sign');

        if (tooManyAttempts(user.id)) {
            return res.status(429).json({ error: 'Too many wrong passwords. Try again in a few minutes.' });
        }
        const account = await prisma.user.findUnique({ where: { id: user.id } });
        if (!account || !(await bcrypt.compare(password, account.passwordHash))) {
            failedAttempt(user.id);
            // 400, not 401: the session is fine, only the signature was refused.
            return res.status(400).json({ error: 'Password is incorrect' });
        }
        attempts.delete(user.id);

        const items = await snapshot(patientId, start, end);
        const contentHash = fingerprint(items);
        // The list must be the one the nurse reviewed.
        if (typeof req.body.contentHash === 'string' && req.body.contentHash !== contentHash) {
            return res.status(409).json({ error: 'The MAR changed while you were reviewing it. Please review it again.', code: 'CHANGED' });
        }

        const row = await prisma.marSignOff.create({
            data: {
                patientId,
                userId: user.id,
                shiftType,
                periodStart: start,
                periodEnd: end,
                summary: { counts: counts(items), items } as any,
                contentHash,
                note: optionalString(req.body.note, 'Note', 500),
            },
            include: { user: { select: { id: true, name: true, role: true } } },
        });
        res.locals.audit = { signOffId: row.id, entries: items.length };
        res.status(201).json({
            id: row.id, shiftType: row.shiftType, periodStart: row.periodStart, periodEnd: row.periodEnd,
            signedAt: row.signedAt, note: row.note, user: row.user, counts: counts(items), changedSince: false,
        });
    } catch (error) {
        sendError(res, error, 'Failed to sign off the MAR');
    }
});

export default router;
