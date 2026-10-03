
import { Router } from 'express';
import prisma from '../prisma';
import { sendToAll } from '../services/pushService';
import { broadcastNotification } from './notifications.routes';

const router = Router();

// Global recent-events feed (across all patients) for the dashboard.
// Declared before /:patientId so the two-segment path matches first.
router.get('/feed/events', async (req, res) => {
    try {
        const events = await prisma.clinicalNote.findMany({
            where: { type: 'EVENT' },
            orderBy: { createdAt: 'desc' },
            take: 40,
            include: {
                author: { select: { name: true, role: true } },
                patient: { select: { id: true, name: true } }
            }
        });
        res.json(events);
    } catch (error) {
        console.error('Error fetching events feed:', error);
        res.status(500).json({ error: 'Failed to fetch events feed' });
    }
});

// Get Notes for a Patient
router.get('/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;
        const { type } = req.query;

        const where: any = { patientId };
        if (type) where.type = type;

        const notes = await prisma.clinicalNote.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                author: { select: { name: true, role: true } }
            }
        });
        res.json(notes);
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
});

// Create Note
router.post('/', async (req, res) => {
    try {
        const { patientId, authorId, type, title, content, data } = req.body;

        const note = await prisma.clinicalNote.create({
            data: {
                patientId,
                authorId,
                type,
                title,
                content,
                data: data || {}
            },
            include: {
                author: { select: { name: true, role: true } }
            }
        });

        // Events are alert-worthy: broadcast + push to every device.
        if (type === 'EVENT') {
            const ep = await prisma.patient.findUnique({ where: { id: patientId }, select: { name: true } });
            const sev = (data && data.severity) ? String(data.severity).toUpperCase() : 'EVENT';
            broadcastNotification('new_event', {
                patientId, patientName: ep?.name, title, severity: data?.severity,
                message: `${title} — ${ep?.name || 'patient'}`
            });
            sendToAll(`${sev}: ${title}`, `${ep?.name || 'Patient'}${content ? ` — ${content}` : ''}`, { type: 'event', patientId });
        }

        res.status(201).json(note);
    } catch (error) {
        console.error('Error creating note:', error);
        res.status(500).json({ error: 'Failed to create note' });
    }
});

export default router;
