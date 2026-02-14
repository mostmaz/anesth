import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// GET all patients
router.get('/', async (req, res) => {
    try {
        const patients = await prisma.patient.findMany({
            include: { admissions: true }
        });
        res.json(patients);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch patients' });
    }
});

// GET patient by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const patient = await prisma.patient.findUnique({
            where: { id },
            include: { admissions: true }
        });
        if (!patient) {
            return res.status(404).json({ error: 'Patient not found' });
        }
        res.json(patient);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch patient' });
    }
});

// POST new patient
router.post('/', async (req, res) => {
    try {
        const { mrn, firstName, lastName, dob, gender } = req.body;
        const patient = await prisma.patient.create({
            data: {
                mrn,
                firstName,
                lastName,
                dob: new Date(dob),
                gender
            }
        });
        res.status(201).json(patient);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create patient' });
    }
});

// PATCH update patient
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, mrn, dob, gender, diagnosis, comorbidities, bed } = req.body;

        console.log(`[PATCH] Updating patient ${id}`, req.body);

        const patient = await prisma.patient.update({
            where: { id },
            data: {
                firstName,
                lastName,
                mrn,
                dob: dob ? new Date(dob) : undefined,
                gender,
                diagnosis,
                comorbidities,
                bed
            } as any
        });
        res.json(patient);
    } catch (error) {
        console.error("Error updating patient:", error);
        res.status(500).json({ error: 'Failed to update patient' });
    }
});

export default router;
