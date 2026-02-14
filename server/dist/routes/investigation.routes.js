"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../prisma"));
const router = (0, express_1.Router)();
// Get Investigations for a Patient
router.get('/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;
        const investigations = await prisma_1.default.investigation.findMany({
            where: { patientId },
            orderBy: { conductedAt: 'desc' },
            include: {
                author: { select: { name: true, role: true } },
                order: { select: { title: true } }
            }
        });
        res.json(investigations);
    }
    catch (error) {
        console.error('Error fetching investigations:', error);
        res.status(500).json({ error: 'Failed to fetch investigations' });
    }
});
// Create Investigation Result
router.post('/', async (req, res) => {
    try {
        const { patientId, authorId, orderId, type, category, title, status, result, impression, conductedAt } = req.body;
        const investigation = await prisma_1.default.investigation.create({
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
    }
    catch (error) {
        console.error('Error creating investigation:', error);
        res.status(500).json({ error: 'Failed to record investigation' });
    }
});
exports.default = router;
