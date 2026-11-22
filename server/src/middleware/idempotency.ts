import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma';

// Safe retries for the phone app's offline queue.
//
// When the connection drops, the app cannot tell whether an entry reached the
// server, so it sends it again with the same Idempotency-Key. The first request
// with a key is carried out and its answer remembered; a repeat gets that same
// answer back and nothing is saved twice.

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const KEY_FORMAT = /^[A-Za-z0-9_-]{16,64}$/;

export async function idempotency(req: Request, res: Response, next: NextFunction) {
    const key = req.get('Idempotency-Key');
    if (!key || !MUTATING.has(req.method)) return next();
    if (!KEY_FORMAT.test(key)) return res.status(400).json({ error: 'Invalid Idempotency-Key' });
    const user = req.user;
    if (!user) return next();

    try {
        // Claim the key first, so two copies arriving together cannot both run.
        await prisma.processedRequest.create({
            data: { id: key, userId: user.id, method: req.method, path: req.originalUrl.split('?')[0].slice(0, 200), status: 0 },
        });
    } catch (e: any) {
        if (e?.code !== 'P2002') return next(e);
        const prior = await prisma.processedRequest.findUnique({ where: { id: key } });
        if (!prior || prior.userId !== user.id) {
            return res.status(409).json({ error: 'This request key belongs to another entry' });
        }
        if (prior.status === 0) {
            return res.status(409).json({ error: 'This entry is still being saved. Try again shortly.', code: 'IN_PROGRESS' });
        }
        res.setHeader('Idempotent-Replay', 'true');
        return res.status(prior.status).json(prior.response ?? {});
    }

    let settled = false;
    const settle = (body: unknown) => {
        if (settled) return;
        settled = true;
        const done = res.statusCode >= 500
            // A server fault saved nothing useful: release the key so a retry can run.
            ? prisma.processedRequest.delete({ where: { id: key } })
            : prisma.processedRequest.update({ where: { id: key }, data: { status: res.statusCode, response: (body ?? {}) as any } });
        done.catch((err) => console.error('[IDEMPOTENCY] could not record result:', err?.message || err));
    };

    const json = res.json.bind(res);
    res.json = ((body: unknown) => { settle(body); return json(body); }) as Response['json'];
    // Responses sent without res.json (sendStatus, end).
    res.on('finish', () => settle(undefined));
    next();
}
