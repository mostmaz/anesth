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

    // Define the listener
    const onNotification = (data: any) => {
        // SSE format requires starting with "data: " and ending with double newline
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Attach listener
    notificationEmitter.on('new_investigation', onNotification);

    // Keep connection alive with a ping comment every 30 seconds
    const keepAliveInterval = setInterval(() => {
        res.write(': ping\n\n');
    }, 30000);

    // Clean up when client closes connection
    req.on('close', () => {
        clearInterval(keepAliveInterval);
        notificationEmitter.off('new_investigation', onNotification);
    });
});

export default router;
