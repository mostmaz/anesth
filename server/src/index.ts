import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import routes from './routes';
import { startLabSyncJob } from './jobs/labSyncScheduler';
import { startReminderScheduler } from './jobs/reminderScheduler';

const app = express();
const port = process.env.PORT || 3001;

// Start Cron Jobs
startLabSyncJob();
startReminderScheduler();

import path from 'path';

// ...
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[REQ] ${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    next();
});

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

import notificationsRouter from './routes/notifications.routes';
app.use('/api', routes);
app.use('/api/notifications', notificationsRouter);

app.get('/', (req, res) => {
    res.json({ message: 'ICU Management System API Running' });
});

// Global Error Logging Middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(`\n[ERROR] ${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    console.error('Request Body:', req.body);
    console.error('Stack Trace:', err.stack || err);

    // Fallback response if headers are not already sent
    if (!res.headersSent) {
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: err.message || String(err)
        });
    }
});

app.listen(port as number, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${port}`);
});
