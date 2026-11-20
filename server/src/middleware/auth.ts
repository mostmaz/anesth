import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../prisma';

export type Role = 'SENIOR' | 'RESIDENT' | 'NURSE';

export interface AuthUser {
    id: string;
    username: string;
    role: Role;
}

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}

// Secrets that have appeared in the repository and must never sign real tokens.
const KNOWN_WEAK_SECRETS = new Set(['dev-secret-key-123', 'fallback_secret_for_dev_only']);

let cachedSecret: string | null = null;

// The signing secret must come from the environment. There is deliberately no
// fallback: a missing or weak secret stops the server instead of signing
// forgeable tokens.
export function jwtSecret(): string {
    if (cachedSecret) return cachedSecret;
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32 || KNOWN_WEAK_SECRETS.has(secret)) {
        throw new Error('JWT_SECRET is missing or too weak. Set a random value of at least 32 characters in the environment.');
    }
    cachedSecret = secret;
    return secret;
}

const SESSION_TTL = '24h';

// Fingerprint of the user's current password, carried in every token. Changing
// or resetting a password changes it, which ends every session and file link
// issued under the old password. It is keyed with the signing secret, so the
// value in a token says nothing about the stored hash.
function passwordVersion(passwordHash: string): string {
    return crypto.createHmac('sha256', jwtSecret()).update(passwordHash).digest('hex').slice(0, 16);
}

// Session token: sent as "Authorization: Bearer" on every API call.
export function signSessionToken(user: AuthUser, passwordHash: string): string {
    return jwt.sign(
        { id: user.id, username: user.username, role: user.role, scope: 'session', pv: passwordVersion(passwordHash) },
        jwtSecret(),
        { expiresIn: SESSION_TTL },
    );
}

// File token: read-only, used in URLs (?ft=) for things that cannot send
// headers — <img> tags, opening a PDF in a new tab, the SSE stream. It cannot
// call the API, so a leaked URL exposes far less than a session token would.
export function signFileToken(user: AuthUser, passwordHash: string): string {
    return jwt.sign({ id: user.id, scope: 'files', pv: passwordVersion(passwordHash) }, jwtSecret(), { expiresIn: SESSION_TTL });
}

// Tokens are checked against the user table so that deleting a user, or
// changing their password, ends their access. The lookup is cached briefly to
// avoid a query on every request.
const USER_CACHE_MS = 60_000;
interface KnownUser { user: AuthUser; pv: string; }
const userCache = new Map<string, { known: KnownUser | null; at: number }>();

async function loadUser(id: string): Promise<KnownUser | null> {
    const hit = userCache.get(id);
    if (hit && Date.now() - hit.at < USER_CACHE_MS) return hit.known;
    const row = await prisma.user.findUnique({ where: { id }, select: { id: true, username: true, role: true, passwordHash: true } });
    const known = row
        ? { user: { id: row.id, username: row.username, role: row.role as Role }, pv: passwordVersion(row.passwordHash) }
        : null;
    userCache.set(id, { known, at: Date.now() });
    return known;
}

export function forgetUser(id: string) {
    userCache.delete(id);
}

function bearerToken(req: Request): string | null {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) return header.slice(7).trim() || null;
    return null;
}

async function userFromToken(token: string, scope: 'session' | 'files'): Promise<AuthUser | null> {
    const payload = jwt.verify(token, jwtSecret()) as { id?: string; scope?: string; pv?: string };
    if (!payload || payload.scope !== scope || !payload.id) return null;
    let known = await loadUser(payload.id);
    // The cached record can predate a password change, so a mismatch is
    // confirmed against the database before the token is turned away.
    if (known && known.pv !== payload.pv) {
        forgetUser(payload.id);
        known = await loadUser(payload.id);
    }
    // A token issued under an earlier password is no longer valid.
    if (!known || known.pv !== payload.pv) return null;
    return known.user;
}

// Requires a valid session token. Sets req.user from the database record, so
// the role always reflects the server's view rather than anything client-sent.
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
    const token = bearerToken(req);
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    try {
        const user = await userFromToken(token, 'session');
        if (!user) return res.status(401).json({ error: 'Session is no longer valid. Please sign in again.' });
        req.user = user;
        next();
    } catch (err: any) {
        if (err?.name === 'TokenExpiredError' || err?.name === 'JsonWebTokenError' || err?.name === 'NotBeforeError') {
            return res.status(401).json({ error: 'Session expired. Please sign in again.' });
        }
        console.error('[AUTH] verification failed:', err?.message || err);
        return res.status(503).json({ error: 'Authentication is temporarily unavailable' });
    }
}

// Accepts either a session token (header) or a file token (?ft= query).
export async function requireFileAccess(req: Request, res: Response, next: NextFunction) {
    try {
        const header = bearerToken(req);
        if (header) {
            const user = await userFromToken(header, 'session');
            if (user) { req.user = user; return next(); }
        }
        const ft = typeof req.query.ft === 'string' ? req.query.ft : null;
        if (ft) {
            const user = await userFromToken(ft, 'files');
            if (user) { req.user = user; return next(); }
        }
        return res.status(401).json({ error: 'Authentication required' });
    } catch (err: any) {
        if (err?.name === 'TokenExpiredError' || err?.name === 'JsonWebTokenError' || err?.name === 'NotBeforeError') {
            return res.status(401).json({ error: 'Link expired. Please sign in again.' });
        }
        console.error('[AUTH] file access check failed:', err?.message || err);
        return res.status(503).json({ error: 'Authentication is temporarily unavailable' });
    }
}

// Use after requireAuth.
export function requireRole(...roles: Role[]) {
    // Request<any> keeps Express's per-route param typing intact for the handler that follows.
    return (req: Request<any, any, any, any>, res: Response, next: NextFunction) => {
        if (!req.user) return res.status(401).json({ error: 'Authentication required' });
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: `This action requires one of: ${roles.join(', ')}` });
        }
        next();
    };
}
