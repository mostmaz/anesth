import { Request, Response, NextFunction } from 'express';

// Small in-memory limiter for failed sign-ins. Only failures count, so normal
// use never trips it. State is per process, which is fine for a single server.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_USER_AND_IP = 8;   // wrong passwords for one account from one address
const MAX_PER_IP = 40;           // wrong passwords from one address across all accounts

const buckets = new Map<string, { count: number; resetAt: number }>();

function keysFor(req: Request): { userKey: string; ipKey: string } {
    const ip = req.ip || 'unknown';
    const username = String(req.body?.username || '').trim().toLowerCase().slice(0, 64);
    return { userKey: `u:${username}|${ip}`, ipKey: `ip:${ip}` };
}

function current(key: string): number {
    const entry = buckets.get(key);
    if (!entry) return 0;
    if (entry.resetAt <= Date.now()) { buckets.delete(key); return 0; }
    return entry.count;
}

function bump(key: string) {
    const now = Date.now();
    const entry = buckets.get(key);
    if (!entry || entry.resetAt <= now) buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    else entry.count += 1;
    if (buckets.size > 5000) {
        for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    }
}

export function loginRateLimit(req: Request, res: Response, next: NextFunction) {
    const { userKey, ipKey } = keysFor(req);
    if (current(userKey) >= MAX_PER_USER_AND_IP || current(ipKey) >= MAX_PER_IP) {
        const resetAt = Math.max(buckets.get(userKey)?.resetAt || 0, buckets.get(ipKey)?.resetAt || 0);
        const minutes = Math.max(1, Math.ceil((resetAt - Date.now()) / 60000));
        res.setHeader('Retry-After', String(minutes * 60));
        return res.status(429).json({ error: `Too many failed sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.` });
    }
    next();
}

export function recordLoginFailure(req: Request) {
    const { userKey, ipKey } = keysFor(req);
    bump(userKey);
    bump(ipKey);
}

export function clearLoginFailures(req: Request) {
    buckets.delete(keysFor(req).userKey);
}
