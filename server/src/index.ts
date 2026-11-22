import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';

import routes from './routes';
import notificationsRouter from './routes/notifications.routes';
import { jwtSecret, requireFileAccess } from './middleware/auth';
import { startLabSyncJob } from './jobs/labSyncScheduler';
import { startReminderScheduler } from './jobs/reminderScheduler';
import { startOverdueDoseScheduler } from './jobs/overdueDoseScheduler';
import { startHousekeeping } from './jobs/housekeeping';

// Refuse to start without a real signing secret.
jwtSecret();

const app = express();
const port = process.env.PORT || 3001;

// Trust X-Forwarded-For only from the reverse proxy on the private network, so
// req.ip is the real client address without letting outsiders spoof it.
app.set('trust proxy', 'loopback, linklocal, uniquelocal');
app.disable('x-powered-by');

// Start Cron Jobs
startLabSyncJob();
startReminderScheduler();
startOverdueDoseScheduler();
startHousekeeping();

// Browsers may only call the API from the listed origins. Requests with no
// Origin header (the mobile apps, server-side tools) are not affected by CORS.
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174')
    .split(',').map(o => o.trim()).filter(Boolean);
app.use(cors({
    origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin)),
}));

app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    // File links carry a token in the query string; never pass it on as a referrer.
    res.setHeader('Referrer-Policy', 'no-referrer');
    if (req.path.startsWith('/api')) res.setHeader('Cache-Control', 'no-store');
    next();
});

app.use(express.json({ limit: '5mb' }));

// Request log: method and path only — no query string (it can hold a file
// token) and never the body (it can hold patient data or passwords).
app.use((req, res, next) => {
    console.log(`[REQ] ${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Uploaded files (lab reports, wound photos, printable reports) hold patient
// data, so they are only served to signed-in users.
app.use('/uploads', requireFileAccess, express.static(path.join(__dirname, '../uploads'), {
    dotfiles: 'deny',
    index: false,
    setHeaders: (res, filePath) => {
        res.setHeader('Cache-Control', 'private, max-age=600');
        if (/\.html?$/i.test(filePath)) {
            // Hosted reports are user-supplied HTML. The sandbox gives them an
            // isolated origin (no access to the app's storage) while still
            // allowing their print dialog.
            res.setHeader('Content-Security-Policy', 'sandbox allow-scripts allow-modals');
        }
    },
}));

// The event stream is opened with EventSource, which cannot send headers, so it
// accepts the file token. It must be mounted before the main router.
app.use('/api/notifications', requireFileAccess, notificationsRouter);
app.use('/api', routes);

app.get('/', (req, res) => {
    res.json({ message: 'ICU Management System API Running' });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err?.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Invalid JSON body' });
    }
    if (err?.type === 'entity.too.large') {
        return res.status(413).json({ error: 'Request body too large' });
    }
    console.error(`\n[ERROR] ${new Date().toISOString()} - ${req.method} ${req.path}`);
    console.error('Stack Trace:', err?.stack || err);

    if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

app.listen(port as number, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${port}`);
});
