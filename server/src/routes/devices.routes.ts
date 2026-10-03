import { Router } from 'express';
import { registerToken, unregisterToken } from '../services/pushService';

const router = Router();

// Register (or move) an FCM device token to a user.
router.post('/register', async (req, res) => {
    try {
        const { userId, token } = req.body;
        if (!userId || !token) return res.status(400).json({ error: 'userId and token are required' });
        await registerToken(userId, token);
        res.json({ success: true });
    } catch (error) {
        console.error('Device register error:', error);
        res.status(500).json({ error: 'Failed to register device' });
    }
});

// Unregister a device token (on sign-out) so the device stops receiving pushes.
router.post('/unregister', async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ error: 'token is required' });
        await unregisterToken(token);
        res.json({ success: true });
    } catch (error) {
        console.error('Device unregister error:', error);
        res.status(500).json({ error: 'Failed to unregister device' });
    }
});

export default router;
