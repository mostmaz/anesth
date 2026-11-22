
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prisma';
import { AuthUser, Role, forgetUser, signFileToken, signSessionToken } from '../middleware/auth';
import { clearLoginFailures, recordLoginFailure } from '../middleware/rateLimit';
import { recordAudit } from '../middleware/audit';

// When set (an ISO date), every account whose password is older than this must
// choose a new one at the next sign-in. Used after a suspected exposure.
function passwordTooOld(changedAt: Date | null): boolean {
    // The zero date marks a temporary password set by a senior.
    if (changedAt && changedAt.getTime() === 0) return true;
    const cutoff = process.env.REQUIRE_PASSWORD_CHANGE_BEFORE;
    if (!cutoff) return false;
    const time = Date.parse(cutoff);
    if (isNaN(time)) return false;
    return !changedAt || changedAt.getTime() < time;
}

export const MIN_PASSWORD_LENGTH = 8;

// Returns an error message if the password is not acceptable, otherwise null.
export function passwordProblem(password: unknown): string | null {
    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
        return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    }
    if (password.toLowerCase() === 'password') return 'Choose a password other than "password"';
    return null;
}

export const login = async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body || {};

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const user = await prisma.user.findUnique({ where: { username } });
        const isValid = user ? await bcrypt.compare(password, user.passwordHash) : false;

        if (!user || !isValid) {
            recordLoginFailure(req);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        clearLoginFailures(req);
        const authUser: AuthUser = { id: user.id, username: user.username, role: user.role as Role };
        // Only what the apps need — never the hash or the device tokens.
        const userWithoutPassword = { id: user.id, name: user.name, username: user.username, role: user.role };
        prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }).catch(() => { });
        recordAudit({ userId: user.id, action: 'SIGN IN', method: 'POST', path: '/api/auth/login', status: 200, ip: req.ip });

        res.json({
            token: signSessionToken(authUser, user.passwordHash),
            fileToken: signFileToken(authUser, user.passwordHash),
            user: userWithoutPassword,
            // Lets the apps prompt for a change while the shared default is still in use.
            mustChangePassword: password === 'password' || passwordTooOld(user.passwordChangedAt),
        });
    } catch (error) {
        console.error('Login error:', (error as Error)?.message || error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Signed-in user changes their own password.
export const changePassword = async (req: Request, res: Response) => {
    try {
        const { currentPassword, newPassword } = req.body || {};
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new password are required' });
        }
        const problem = passwordProblem(newPassword);
        if (problem) return res.status(400).json({ error: problem });

        const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
        if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
            // 400, not 401: the session is fine, so the apps must not treat this as "signed out".
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({ where: { id: user.id }, data: { passwordHash, passwordChangedAt: new Date() } });
        forgetUser(user.id);
        recordAudit({ userId: user.id, action: 'CHANGE own password', method: 'POST', path: '/api/auth/change-password', status: 200, ip: req.ip });

        // Changing the password ends every session issued under the old one,
        // so this device is handed fresh tokens to stay signed in.
        const authUser: AuthUser = { id: user.id, username: user.username, role: user.role as Role };
        res.json({
            success: true,
            token: signSessionToken(authUser, passwordHash),
            fileToken: signFileToken(authUser, passwordHash),
        });
    } catch (error) {
        console.error('Change password error:', (error as Error)?.message || error);
        res.status(500).json({ error: 'Failed to change password' });
    }
};
