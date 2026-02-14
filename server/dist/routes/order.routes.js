"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../prisma"));
const router = (0, express_1.Router)();
// Get Orders for a Patient
router.get('/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;
        const orders = await prisma_1.default.clinicalOrder.findMany({
            where: { patientId },
            orderBy: { createdAt: 'desc' },
            include: {
                author: { select: { name: true, role: true } },
                approver: { select: { name: true } }
            }
        });
        res.json(orders);
    }
    catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});
// Create Order (RBAC Logic)
router.post('/', async (req, res) => {
    try {
        const { patientId, authorId, type, title, details, notes, priority } = req.body;
        const user = await prisma_1.default.user.findUnique({ where: { id: authorId } });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        // Logic: Seniors approve immediately, others are Pending
        const initialStatus = user.role === 'SENIOR' ? 'APPROVED' : 'PENDING';
        const approverId = user.role === 'SENIOR' ? user.id : null;
        const order = await prisma_1.default.clinicalOrder.create({
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
    }
    catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});
// Update Order Status (Approve/Discontinue)
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, userId } = req.body; // userId of who is performing the action
        const user = await prisma_1.default.user.findUnique({ where: { id: userId } });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        // Logic: Only Seniors can Approve
        if (status === 'APPROVED' && user.role !== 'SENIOR') {
            return res.status(403).json({ error: 'Only Seniors can approve orders' });
        }
        const updateData = { status };
        if (status === 'APPROVED') {
            updateData.approverId = userId;
        }
        const order = await prisma_1.default.clinicalOrder.update({
            where: { id },
            data: updateData,
            include: {
                author: { select: { name: true, role: true } },
                approver: { select: { name: true } }
            }
        });
        res.json(order);
    }
    catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({ error: 'Failed to update order' });
    }
});
exports.default = router;
