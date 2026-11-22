
import { Router } from 'express';
import prisma from '../prisma';
import { requireRole } from '../middleware/auth';
import { BadRequest, oneOf, optionalString, requiredNumber, requiredString, sendError } from '../lib/validate';
import { IO_AMOUNT_LIMIT } from '../shared/ranges';

const router = Router();

// Get I/O History
router.get('/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;
        const entries = await prisma.intakeOutput.findMany({
            where: { patientId },
            orderBy: { timestamp: 'desc' },
            include: { user: { select: { name: true } } }
        });
        res.json(entries);
    } catch (error) {
        console.error('Error fetching I/O:', error);
        res.status(500).json({ error: 'Failed to fetch I/O history' });
    }
});

// Record I/O
router.post('/', async (req, res) => {
    try {
        const b = req.body || {};
        const amount = requiredNumber(b.amount, IO_AMOUNT_LIMIT);
        if (amount <= 0) throw new BadRequest('Amount must be more than 0 mL');

        const entry = await prisma.intakeOutput.create({
            data: {
                patientId: requiredString(b.patientId, 'Patient'),
                userId: req.user!.id,
                shiftId: typeof b.shiftId === 'string' && b.shiftId ? b.shiftId : null,
                type: oneOf(b.type, 'Type', ['INPUT', 'OUTPUT'] as const),
                category: requiredString(b.category, 'Category', 120),
                amount,
                notes: optionalString(b.notes, 'Notes', 500)
            },
            include: { user: { select: { name: true } } }
        });
        res.status(201).json(entry);
    } catch (error) {
        sendError(res, error, 'Failed to record I/O');
    }
});

// Edit I/O Entry (Nurse requires approval, Senior direct)
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const amount = requiredNumber(req.body?.amount, IO_AMOUNT_LIMIT);
        if (amount <= 0) return res.status(400).json({ error: 'Amount must be more than 0 mL' });
        const user = req.user!;

        if (user.role === 'NURSE') {
            // Nurse edit requires approval
            const entry = await prisma.intakeOutput.update({
                where: { id },
                data: {
                    status: 'PENDING_EDIT',
                    pendingValue: Number(amount)
                },
                include: { user: { select: { name: true } } }
            });
            return res.json(entry);
        } else {
            // Direct edit for SENIOR/RESIDENT
            const entry = await prisma.intakeOutput.update({
                where: { id },
                data: {
                    amount: Number(amount),
                    status: 'APPROVED',
                    pendingValue: null
                },
                include: { user: { select: { name: true } } }
            });
            return res.json(entry);
        }
    } catch (error) {
        console.error('Error editing I/O:', error);
        res.status(500).json({ error: 'Failed to edit I/O' });
    }
});

// Approve Pending Edit
router.patch('/:id/approve', requireRole('SENIOR', 'RESIDENT'), async (req, res) => {
    try {
        const { id } = req.params;
        const entry = await prisma.intakeOutput.findUnique({ where: { id } });
        if (!entry || entry.pendingValue === null || entry.pendingValue === undefined) return res.status(400).json({ error: 'No pending edit found' });

        const updated = await prisma.intakeOutput.update({
            where: { id },
            data: {
                amount: entry.pendingValue,
                status: 'APPROVED',
                pendingValue: null
            },
            include: { user: { select: { name: true } } }
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Failed to approve edit' });
    }
});

// Reject Pending Edit
router.patch('/:id/reject', requireRole('SENIOR', 'RESIDENT'), async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await prisma.intakeOutput.update({
            where: { id },
            data: {
                status: 'APPROVED',
                pendingValue: null
            },
            include: { user: { select: { name: true } } }
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Failed to reject edit' });
    }
});

export default router;
