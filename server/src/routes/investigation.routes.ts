
import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// Get Investigations for a Patient
router.get('/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;
        const investigations = await prisma.investigation.findMany({
            where: { patientId },
            orderBy: { conductedAt: 'desc' },
            include: {
                author: { select: { name: true, role: true } },
                order: { select: { title: true } }
            }
        });
        res.json(investigations);
    } catch (error) {
        console.error('Error fetching investigations:', error);
        res.status(500).json({ error: 'Failed to fetch investigations' });
    }
});

// Create Investigation Result
router.post('/', async (req, res) => {
    try {
        const { patientId, authorId, orderId, type, category, title, status, result, impression, conductedAt } = req.body;

        const investigation = await prisma.investigation.create({
            data: {
                patientId,
                authorId,
                orderId: orderId || null,
                type,
                category,
                title,
                status: status || 'FINAL',
                result: result || {},
                impression,
                conductedAt: conductedAt ? new Date(conductedAt) : new Date()
            },
            include: {
                author: { select: { name: true, role: true } }
            }
        });

        // If linked to an order, potentially update order status to COMPLETED?
        // keeping it simple for now.

        res.status(201).json(investigation);
    } catch (error) {
        console.error('Error creating investigation:', error);
        res.status(500).json({ error: 'Failed to record investigation' });
    }
});

// Delete Investigation
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.investigation.delete({
            where: { id }
        });
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting investigation:', error);
        res.status(500).json({ error: 'Failed to delete investigation' });
    }
});

export default router;
