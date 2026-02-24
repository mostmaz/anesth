import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// GET all doctors
router.get('/', async (req, res) => {
    try {
        const doctors = await prisma.doctor.findMany({
            include: { specialty: true }
        });
        res.json(doctors);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch doctors' });
    }
});

// CREATE doctor
router.post('/', async (req, res) => {
    try {
        const { name, specialtyId } = req.body;
        const doctor = await prisma.doctor.create({
            data: { name, specialtyId },
            include: { specialty: true }
        });
        res.status(201).json(doctor);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create doctor' });
    }
});

// GET all specialties
router.get('/specialties/all', async (req, res) => {
    try {
        const specialties = await prisma.specialty.findMany();
        res.json(specialties);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch specialties' });
    }
});

// CREATE specialty
router.post('/specialties', async (req, res) => {
    try {
        const { name } = req.body;
        const specialty = await prisma.specialty.create({
            data: { name }
        });
        res.status(201).json(specialty);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create specialty' });
    }
});

export default router;
