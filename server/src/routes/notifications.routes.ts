import { Router, Request, Response } from 'express';
import { EventEmitter } from 'events';
// Brings in the typing of req.user (set by the authentication middleware).
import type { AuthUser } from '../middleware/auth';

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

    // Wrap each event with its type so the clients can distinguish them. An
    // event may carry `_to` (a list of user ids): it is then delivered only to
    // those users' streams, and the list itself is never sent out.
    const userId = (req.user as AuthUser | undefined)?.id;
    const makeListener = (eventType: string) => (data: any) => {
        const { _to, ...payload } = data || {};
        if (Array.isArray(_to) && (!userId || !_to.includes(userId))) return;
        res.write(`data: ${JSON.stringify({ type: eventType, ...payload })}\n\n`);
    };

    const onInvestigation  = makeListener('new_investigation');
    const onAdmission      = makeListener('new_admission');
    const onOrder          = makeListener('new_order');
    const onSystemUpdate   = makeListener('system_update');
    const onReminder       = makeListener('intervention_reminder');
    const onEvent          = makeListener('new_event');
    const onDoseOverdue    = makeListener('dose_overdue');

    notificationEmitter.on('new_investigation',    onInvestigation);
    notificationEmitter.on('new_admission',         onAdmission);
    notificationEmitter.on('new_order',             onOrder);
    notificationEmitter.on('system_update',         onSystemUpdate);
    notificationEmitter.on('intervention_reminder', onReminder);
    notificationEmitter.on('new_event',             onEvent);
    notificationEmitter.on('dose_overdue',          onDoseOverdue);

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
        notificationEmitter.off('new_event',             onEvent);
        notificationEmitter.off('dose_overdue',          onDoseOverdue);
    });
});

export default router;
