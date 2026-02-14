"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../prisma"));
const router = (0, express_1.Router)();
// GET vitals for a patient
router.get('/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;
        const vitals = await prisma_1.default.vitalSign.findMany({
            where: { patientId },
            orderBy: { timestamp: 'desc' },
            take: 50
        });
        res.json(vitals);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch vitals' });
    }
});
// POST new vital sign
router.post('/', async (req, res) => {
    try {
        const { patientId, heartRate, bpSys, bpDia, spo2, temp } = req.body;
        const vital = await prisma_1.default.vitalSign.create({
            data: {
                patientId,
                heartRate: heartRate ? Number(heartRate) : null,
                bpSys: bpSys ? Number(bpSys) : null,
                bpDia: bpDia ? Number(bpDia) : null,
                spo2: spo2 ? Number(spo2) : null,
                temp: temp ? Number(temp) : null,
                timestamp: new Date()
            }
        });
        res.status(201).json(vital);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to record vitals' });
    }
});
exports.default = router;
