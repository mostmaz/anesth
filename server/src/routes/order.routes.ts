
import { Router } from 'express';
import prisma from '../prisma';
import { broadcastNotification } from './notifications.routes';

const router = Router();

// GET due intervention reminders (reminderAt <= now, PROCEDURE type, not COMPLETED)
router.get('/due-reminders', async (req, res) => {
    try {
        const { userId } = req.query;
        const now = new Date();
        const where: any = {
            type: 'PROCEDURE',
            reminderAt: { lte: now },
            status: { not: 'COMPLETED' }
        };

        if (userId) {
            where.patient = {
                assignments: {
                    some: { userId: String(userId), isActive: true }
                }
            };
        }

        const orders = await prisma.clinicalOrder.findMany({
            where,
            orderBy: { reminderAt: 'asc' },
            include: {
                patient: { select: { id: true, name: true, mrn: true } },
                author: { select: { name: true, role: true } }
            }
        });
        res.json(orders);
    } catch (error) {
        console.error('Error fetching due reminders:', error);
        res.status(500).json({ error: 'Failed to fetch due reminders' });
    }
});

// GET all pending orders (for Dashboard)
router.get('/pending', async (req, res) => {
    try {
        const orders = await prisma.clinicalOrder.findMany({
            where: { status: 'PENDING' },
            orderBy: { createdAt: 'desc' },
            include: {
                patient: { select: { name: true, mrn: true } },
                author: { select: { name: true, role: true } }
            },
            take: 10 // Limit for dashboard
        });
        res.json(orders);
    } catch (error) {
        console.error('Error fetching pending orders:', error);
        res.status(500).json({ error: 'Failed to fetch pending orders' });
    }
});

// GET recent orders (for Dashboard)
router.get('/recent', async (req, res) => {
    try {
        const { userId } = req.query;
        const where: any = {};

        if (userId) {
            where.patient = {
                assignments: {
                    some: { userId: String(userId), isActive: true }
                }
            };
        }

        const orders = await prisma.clinicalOrder.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                patient: { select: { name: true, mrn: true } },
                author: { select: { name: true, role: true } }
            },
            take: 10
        });
        res.json(orders);
    } catch (error) {
        console.error('Error fetching recent orders:', error);
        res.status(500).json({ error: 'Failed to fetch recent orders' });
    }
});

// GET active orders (Approved/In Progress)
router.get('/active', async (req, res) => {
    try {
        const { userId } = req.query;
        const where: any = {
            status: { in: ['APPROVED', 'PENDING'] }
        };

        if (userId) {
            where.patient = {
                assignments: {
                    some: { userId: String(userId), isActive: true }
                }
            };
        }

        const orders = await prisma.clinicalOrder.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                patient: { select: { name: true, mrn: true } },
                author: { select: { name: true, role: true } }
            },
            take: 20
        });
        res.json(orders);
    } catch (error) {
        console.error('Error fetching active orders:', error);
        res.status(500).json({ error: 'Failed to fetch active orders' });
    }
});

// GET completed orders
router.get('/completed', async (req, res) => {
    try {
        const { userId } = req.query;
        const where: any = {
            status: 'COMPLETED'
        };

        if (userId) {
            where.patient = {
                assignments: {
                    some: { userId: String(userId), isActive: true }
                }
            };
        }

        const orders = await prisma.clinicalOrder.findMany({
            where,
            orderBy: { updatedAt: 'desc' },
            include: {
                patient: { select: { name: true, mrn: true } },
                author: { select: { name: true, role: true } }
            },
            take: 20
        });
        res.json(orders);
    } catch (error) {
        console.error('Error fetching completed orders:', error);
        res.status(500).json({ error: 'Failed to fetch completed orders' });
    }
});

// Get Orders for a Patient
router.get('/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;
        const orders = await prisma.clinicalOrder.findMany({
            where: { patientId },
            orderBy: { createdAt: 'desc' },
            include: {
                author: { select: { name: true, role: true } },
                approver: { select: { name: true } }
            }
        });
        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// Create Order (RBAC Logic)
router.post('/', async (req, res) => {
    try {
        const { patientId, authorId, type, title, details, notes, priority, reminderAt } = req.body;

        const user = await prisma.user.findUnique({ where: { id: authorId } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Logic: All orders are immediately APPROVED (Active) as per user request to remove Pending state
        const initialStatus = 'APPROVED';
        const approverId = authorId; // Auto-approved by author

        const order = await prisma.clinicalOrder.create({
            data: {
                patientId,
                authorId,
                type,
                status: initialStatus,
                priority: priority || 'ROUTINE',
                title,
                details: details || {},
                notes,
                approverId,
                // @ts-ignore
                reminderAt: reminderAt ? new Date(reminderAt) : null
            },
            // @ts-ignore
            include: {
                author: { select: { name: true, role: true } },
                approver: { select: { name: true } }
            }
        });
        broadcastNotification('new_order', {
            orderId: order.id,
            patientId: order.patientId,
            type: order.type,
            title: order.title,
            priority: order.priority,
            message: `New ${order.type} order: ${order.title}`
        });

        res.status(201).json(order);
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

// Update Order Status (Approve/Discontinue)
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, userId } = req.body; // userId of who is performing the action

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Logic: Only Seniors can Approve
        if (status === 'APPROVED' && user.role !== 'SENIOR') {
            return res.status(403).json({ error: 'Only Seniors can approve orders' });
        }

        const updateData: any = { status };
        if (status === 'APPROVED') {
            updateData.approverId = userId;
        }

        const order = await prisma.clinicalOrder.update({
            where: { id },
            data: updateData,
            include: {
                author: { select: { name: true, role: true } },
                approver: { select: { name: true } }
            }
        });
        res.json(order);
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({ error: 'Failed to update order' });
    }
});

export default router;
