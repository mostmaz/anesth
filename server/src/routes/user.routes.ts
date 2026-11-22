
import { Router } from 'express';
import prisma from '../prisma';
import bcrypt from 'bcryptjs';
import { forgetUser, requireRole } from '../middleware/auth';
import { passwordProblem } from '../controllers/auth.controller';

const router = Router();

// GET all users
router.get('/', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                username: true,
                role: true,
                lastLoginAt: true,
                createdAt: true,
                dismissedLabs: true
            },
            orderBy: { name: 'asc' }
        });
        res.json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// GET current user details
router.get('/:id/preferences', async (req, res) => {
    try {
        if (req.user!.id !== req.params.id) return res.status(403).json({ error: 'You can only read your own preferences' });
        const user = await prisma.user.findUnique({
            where: { id: req.params.id },
            select: { dismissedLabs: true }
        });
        res.json({ dismissedLabs: user?.dismissedLabs || [] });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch preferences' });
    }
});

// DISMISS a lab notification
router.post('/:id/dismiss-lab', async (req, res) => {
    try {
        if (req.user!.id !== req.params.id) return res.status(403).json({ error: 'You can only change your own preferences' });
        const { labId } = req.body;
        if (!labId) return res.status(400).json({ error: 'labId required' });

        await prisma.user.update({
            where: { id: req.params.id },
            data: {
                dismissedLabs: {
                    push: labId
                }
            }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to dismiss lab' });
    }
});

// CREATE user
router.post('/', requireRole('SENIOR'), async (req, res) => {
    try {
        const { name, username, password, role } = req.body;

        if (!name || !username || !password || !role) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        if (!['SENIOR', 'RESIDENT', 'NURSE'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }
        const problem = passwordProblem(password);
        if (problem) return res.status(400).json({ error: problem });

        const existingUser = await prisma.user.findUnique({ where: { username } });
        if (existingUser) {
            return res.status(409).json({ error: 'Username already exists' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                name,
                username,
                passwordHash,
                // Temporary until the new user signs in and chooses their own.
                passwordChangedAt: new Date(0),
                role
            },
            select: {
                id: true,
                name: true,
                username: true,
                role: true
            }
        });

        res.status(201).json(newUser);
    } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// RESET a user's password (SENIOR only)
router.put('/:id/password', requireRole('SENIOR'), async (req, res) => {
    try {
        const { newPassword } = req.body || {};
        const problem = passwordProblem(newPassword);
        if (problem) return res.status(400).json({ error: problem });

        const target = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true } });
        if (!target) return res.status(404).json({ error: 'User not found' });

        // A password set by someone else is temporary: the zero date marks it so
        // that its owner has to choose their own at the next sign-in.
        await prisma.user.update({ where: { id: target.id }, data: { passwordHash: await bcrypt.hash(newPassword, 10), passwordChangedAt: new Date(0) } });
        forgetUser(target.id);
        res.json({ success: true });
    } catch (error) {
        console.error("Error resetting password:", (error as Error)?.message || error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

// DELETE user
router.delete('/:id', requireRole('SENIOR'), async (req, res) => {
    try {
        const { id } = req.params;
        if (id === req.user!.id) return res.status(400).json({ error: 'You cannot delete your own account' });
        await prisma.user.delete({ where: { id } });
        forgetUser(id);
        res.json({ success: true, message: 'User deleted' });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

export default router;
