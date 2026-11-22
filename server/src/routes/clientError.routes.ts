import { Router } from 'express';
import prisma from '../prisma';

// Crash and error reports from the web and phone apps, kept on our own server
// (no third-party service). The apps send the error text and stack only.
const router = Router();

const MAX_PER_HOUR = 30;
const sent = new Map<string, { count: number; resetAt: number }>();

const text = (value: unknown, max: number): string | null => {
    if (typeof value !== 'string' || !value) return null;
    return value.slice(0, max);
};

router.post('/', async (req, res) => {
    try {
        const user = req.user!;
        const now = Date.now();
        const bucket = sent.get(user.id);
        if (!bucket || bucket.resetAt <= now) sent.set(user.id, { count: 1, resetAt: now + 60 * 60_000 });
        else if (++bucket.count > MAX_PER_HOUR) return res.status(429).json({ error: 'Too many reports' });

        const message = text(req.body?.message, 500);
        if (!message) return res.status(400).json({ error: 'message is required' });
        const platform = ['web', 'android', 'ios'].includes(req.body?.platform) ? req.body.platform : 'web';

        // Context is limited to a few short technical fields.
        const raw = (req.body?.context && typeof req.body.context === 'object') ? req.body.context as Record<string, unknown> : {};
        const context: Record<string, string> = {};
        for (const key of ['screen', 'route', 'component', 'device', 'os', 'fatal']) {
            const v = raw[key];
            if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') context[key] = String(v).slice(0, 120);
        }

        await prisma.clientError.create({
            data: {
                userId: user.id,
                platform,
                appVersion: text(req.body?.appVersion, 40),
                message,
                stack: text(req.body?.stack, 6000),
                context,
            },
        });
        res.status(201).json({ success: true });
    } catch (error) {
        console.error('Client error report failed:', (error as Error)?.message || error);
        res.status(500).json({ error: 'Failed to save report' });
    }
});

export default router;
