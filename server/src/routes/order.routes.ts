
import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// GET all pending orders (for Dashboard)
router.get('/pending', async (req, res) => {
    try {
        const orders = await prisma.clinicalOrder.findMany({
            where: { status: 'PENDING' },
            orderBy: { createdAt: 'desc' },
            include: {
                patient: { select: { firstName: true, lastName: true, mrn: true } },
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
        const orders = await prisma.clinicalOrder.findMany({
            where: {
                // optional: filter out DISCONTINUED if cluttering? 
                // For now show all recent activity
            },
            orderBy: { createdAt: 'desc' },
            include: {
                patient: { select: { firstName: true, lastName: true, mrn: true } },
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
        const orders = await prisma.clinicalOrder.findMany({
            where: {
                status: 'APPROVED'
            },
            orderBy: { createdAt: 'desc' },
            include: {
                patient: { select: { firstName: true, lastName: true, mrn: true } },
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
        const orders = await prisma.clinicalOrder.findMany({
            where: {
                status: 'COMPLETED'
            },
            orderBy: { updatedAt: 'desc' },
            include: {
                patient: { select: { firstName: true, lastName: true, mrn: true } },
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
        const { patientId, authorId, type, title, details, notes, priority } = req.body;

        const user = await prisma.user.findUnique({ where: { id: authorId } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Logic: Seniors approve immediately, others are Pending
        const initialStatus = user.role === 'SENIOR' ? 'APPROVED' : 'PENDING';
        const approverId = user.role === 'SENIOR' ? user.id : null;

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
                approverId
            },
            include: {
                author: { select: { name: true, role: true } },
                approver: { select: { name: true } }
            }
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
