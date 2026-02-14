"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../prisma"));
const router = (0, express_1.Router)();
// Get Check-ins
router.get('/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;
        const checkIns = await prisma_1.default.nurseCheckIn.findMany({
            where: { patientId },
            orderBy: { timestamp: 'desc' },
            take: 10,
            include: { user: { select: { name: true } } }
        });
        res.json(checkIns);
    }
    catch (error) {
        console.error('Error fetching check-ins:', error);
        res.status(500).json({ error: 'Failed to fetch check-ins' });
    }
});
// Create Check-in
router.post('/', async (req, res) => {
    try {
        const { patientId, userId, shiftId, airwaySafe, breathingOk, circulationOk, notes } = req.body;
        const checkIn = await prisma_1.default.nurseCheckIn.create({
            data: {
                patientId,
                userId,
                shiftId: shiftId || null,
                airwaySafe,
                breathingOk,
                circulationOk,
                notes
            },
            include: { user: { select: { name: true } } }
        });
        res.status(201).json(checkIn);
    }
    catch (error) {
        console.error('Error creating check-in:', error);
        res.status(500).json({ error: 'Failed to check in' });
    }
});
exports.default = router;
