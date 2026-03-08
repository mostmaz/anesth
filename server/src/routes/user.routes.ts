
import { Router } from 'express';
import prisma from '../prisma';
import bcrypt from 'bcryptjs';

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
router.post('/', async (req, res) => {
    try {
        const { name, username, password, role } = req.body;

        if (!name || !username || !password || !role) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

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

// DELETE user
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.user.delete({ where: { id } });
        res.json({ success: true, message: 'User deleted' });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

export default router;
