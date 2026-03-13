import { Router, Request, Response } from 'express';
import { EventEmitter } from 'events';

const router = Router();

// Create a global event emitter for the application
export const notificationEmitter = new EventEmitter();

// Allow unlimited listeners (one for each connected browser tab)
notificationEmitter.setMaxListeners(0);

// Helper function to broadcast events to all connected clients
export const broadcastNotification = (event: string, data: any) => {
    notificationEmitter.emit(event, data);
};

// SSE Endpoint
router.get('/stream', (req: Request, res: Response) => {
    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Ensure headers are sent immediately

    // Wrap each event with its type so the Android client can distinguish them
    const makeListener = (eventType: string) => (data: any) => {
        res.write(`data: ${JSON.stringify({ type: eventType, ...data })}\n\n`);
    };

    const onInvestigation  = makeListener('new_investigation');
    const onAdmission      = makeListener('new_admission');
    const onOrder          = makeListener('new_order');
    const onSystemUpdate   = makeListener('system_update');
    const onReminder       = makeListener('intervention_reminder');

    notificationEmitter.on('new_investigation',    onInvestigation);
    notificationEmitter.on('new_admission',         onAdmission);
    notificationEmitter.on('new_order',             onOrder);
    notificationEmitter.on('system_update',         onSystemUpdate);
    notificationEmitter.on('intervention_reminder', onReminder);

    // Keep connection alive with a ping comment every 30 seconds
    const keepAliveInterval = setInterval(() => {
        res.write(': ping\n\n');
    }, 30000);

    // Clean up when client closes connection
    req.on('close', () => {
        clearInterval(keepAliveInterval);
        notificationEmitter.off('new_investigation',    onInvestigation);
        notificationEmitter.off('new_admission',         onAdmission);
        notificationEmitter.off('new_order',             onOrder);
        notificationEmitter.off('system_update',         onSystemUpdate);
        notificationEmitter.off('intervention_reminder', onReminder);
    });
});

export default router;
