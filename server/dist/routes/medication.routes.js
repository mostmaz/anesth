"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../prisma"));
const router = (0, express_1.Router)();
// GET MAR for a patient
router.get('/:patientId/mar', async (req, res) => {
    try {
        const { patientId } = req.params;
        // Fetch medications and their administrations for this patient
        const medications = await prisma_1.default.medication.findMany({
            include: {
                administrations: {
                    where: { patientId },
                    orderBy: { timestamp: 'desc' }
                }
            }
        });
        res.json(medications);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch MAR' });
    }
});
// POST administer medication
router.post('/administer', async (req, res) => {
    try {
        const { patientId, medicationId, status, dose } = req.body;
        const administration = await prisma_1.default.medicationAdministration.create({
            data: {
                patientId,
                medicationId,
                status,
                dose,
                timestamp: new Date()
            }
        });
        res.json(administration);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to administer medication' });
    }
});
// POST create a new medication (admin/sytem use)
router.post('/', async (req, res) => {
    try {
        const { name, defaultDose, route, frequency } = req.body;
        const med = await prisma_1.default.medication.create({
            data: { name, defaultDose, route, frequency }
        });
        res.status(201).json(med);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create medication' });
    }
});
exports.default = router;
