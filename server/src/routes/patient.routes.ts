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

// CREATE patient
router.post('/', async (req, res) => {
    try {
        const { name, mrn, dob, gender, diagnosis, comorbidities, authorId } = req.body;

        // 1. Create Patient
        const patient = await prisma.patient.create({
            data: {
                name,
                mrn,
                dob: new Date(dob),
                gender,
                diagnosis,
                comorbidities,
                admissions: {
                    create: {
                        diagnosis: diagnosis,
                        admittedAt: new Date()
                    }
                }
            }
        });

        // 2. Auto-create "Admit to HAMSA" Order
        // We need an authorId. If not provided, we try to find a default user or skip.
        // For now, let's assume the frontend sends 'authorId' or we use a fallback.
        let orderAuthorId = authorId;
        if (!orderAuthorId) {
            const defaultUser = await prisma.user.findFirst();
            orderAuthorId = defaultUser?.id;
        }

        if (orderAuthorId) {
            await prisma.clinicalOrder.create({
                data: {
                    patientId: patient.id,
                    authorId: orderAuthorId,
                    type: 'NURSING', // or PROTOCOL
                    status: 'APPROVED', // Auto-approved
                    approverId: orderAuthorId,
                    priority: 'ROUTINE',
                    title: 'Admit Patient in HAMSA System',
                    details: { instruction: 'Please complete admission in HAMSA hospital system to ICU' }
                }
            });
        }

        res.status(201).json(patient);
    } catch (error) {
        console.error("Error creating patient:", error);
        res.status(500).json({ error: 'Failed to create patient' });
    }
});

// UPDATE patient
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, mrn, dob, gender, diagnosis, comorbidities } = req.body;

        const patient = await prisma.patient.update({
            where: { id },
            data: {
                name,
                mrn,
                dob: dob ? new Date(dob) : undefined,
                gender,
                diagnosis,
                comorbidities
            }
        });
        res.json(patient);
    } catch (error) {
        console.error("Error updating patient:", error);
        res.status(500).json({ error: 'Failed to update patient' });
    }
});

// PATCH discharge patient
router.patch('/:id/discharge', async (req, res) => {
    try {
        const { id } = req.params;
        const { dischargedAt } = req.body;

        console.log(`[DISCHARGE] Discharging patient ${id}`);

        // Update active admission
        // We find the admission where dischargedAt is null
        const activeAdmission = await prisma.admission.findFirst({
            where: {
                patientId: id,
                dischargedAt: null
            }
        });

        if (activeAdmission) {
            await prisma.admission.update({
                where: { id: activeAdmission.id },
                data: {
                    dischargedAt: dischargedAt ? new Date(dischargedAt) : new Date()
                }
            });
            res.json({ success: true, message: 'Patient discharged' });
        } else {
            // If no active admission, maybe they are already discharged?
            // We can just return success or a specific message.
            // Let's check if the patient exists first.
            const patient = await prisma.patient.findUnique({ where: { id } });
            if (!patient) return res.status(404).json({ error: 'Patient not found' });

            res.json({ success: true, message: 'No active admission found (already discharged?)' });
        }

    } catch (error) {
        console.error("Error discharging patient:", error);
        res.status(500).json({ error: 'Failed to discharge patient' });
    }
});

// DELETE patient
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[DELETE] Deleting patient ${id}`);
        await prisma.patient.delete({
            where: { id }
        });
        res.json({ success: true, message: 'Patient deleted' });
    } catch (error) {
        console.error("Error deleting patient:", error);
        res.status(500).json({ error: 'Failed to delete patient' });
    }
});

export default router;
