
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';

export const login = async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;
        console.log(`[LOGIN DEBUG] Attempting login for: '${username}'`);
        console.log(`[LOGIN DEBUG] Password received length: ${password?.length}`);

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const user = await prisma.user.findUnique({
            where: { username }
        });

        if (!user) {
            console.log(`[LOGIN DEBUG] User '${username}' not found.`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        console.log(`[LOGIN DEBUG] User found: ${user.id}, Hash: ${user.passwordHash.substring(0, 10)}...`);

        const isValid = await bcrypt.compare(password, user.passwordHash);
        console.log(`[LOGIN DEBUG] Password match result: ${isValid}`);

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const secret = process.env.JWT_SECRET || 'dev-secret-key-123';
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            secret,
            { expiresIn: '24h' }
        );

        const { passwordHash, ...userWithoutPassword } = user;

        res.json({
            token,
            user: userWithoutPassword
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
