"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../prisma"));
const router = (0, express_1.Router)();
// GET all patients
router.get('/', async (req, res) => {
    try {
        const patients = await prisma_1.default.patient.findMany({
            include: { admissions: true }
        });
        res.json(patients);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch patients' });
    }
});
// GET patient by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const patient = await prisma_1.default.patient.findUnique({
            where: { id },
            include: { admissions: true }
        });
        if (!patient) {
            return res.status(404).json({ error: 'Patient not found' });
        }
        res.json(patient);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch patient' });
    }
});
// POST new patient
router.post('/', async (req, res) => {
    try {
        const { mrn, firstName, lastName, dob, gender } = req.body;
        const patient = await prisma_1.default.patient.create({
            data: {
                mrn,
                firstName,
                lastName,
                dob: new Date(dob),
                gender
            }
        });
        res.status(201).json(patient);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create patient' });
    }
});
exports.default = router;
