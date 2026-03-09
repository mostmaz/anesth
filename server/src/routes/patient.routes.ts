import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// GET all patients
router.get('/', async (req, res) => {
    try {
        const patients = await prisma.patient.findMany({
            include: {
                admissions: {
                    include: { doctor: true, specialty: true }
                },
                assignments: {
                    where: { isActive: true },
                    include: { user: { select: { name: true, role: true } } }
                }
            }
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
            include: {
                admissions: {
                    include: { doctor: true, specialty: true }
                },
                assignments: {
                    where: { isActive: true },
                    include: { user: { select: { name: true, role: true } } }
                }
            }
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
        const { name, mrn, dob, gender, diagnosis, comorbidities, authorId, doctorId, specialtyId } = req.body;

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
                        admittedAt: new Date(),
                        doctorId: doctorId || undefined,
                        specialtyId: specialtyId || undefined
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
        const { name, mrn, dob, gender, diagnosis, comorbidities, doctorId, specialtyId } = req.body;

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

        if (doctorId !== undefined || specialtyId !== undefined) {
            const activeAdmission = await prisma.admission.findFirst({
                where: { patientId: id, dischargedAt: null }
            });
            if (activeAdmission) {
                await prisma.admission.update({
                    where: { id: activeAdmission.id },
                    data: {
                        doctorId: doctorId || undefined,
                        specialtyId: specialtyId || undefined
                    }
                });
            }
        }

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

// GET patient timeline activity
router.get('/:id/timeline', async (req, res) => {
    try {
        const { id } = req.params;

        const [meds, orders, consults, notes, labs] = await Promise.all([
            prisma.medication.findMany({ where: { patientId: id }, orderBy: { updatedAt: 'desc' } as any }),
            prisma.clinicalOrder.findMany({ where: { patientId: id }, orderBy: { createdAt: 'desc' } }),
            prisma.consultation.findMany({ where: { patientId: id }, orderBy: { timestamp: 'desc' } }),
            prisma.clinicalNote.findMany({ where: { patientId: id }, orderBy: { createdAt: 'desc' } }),
            prisma.investigation.findMany({ where: { patientId: id }, orderBy: { updatedAt: 'desc' } as any })
        ]);

        const timeline: any[] = [];

        // 1. Process Medications
        meds.forEach(m => {
            timeline.push({
                id: m.id,
                type: 'MEDICATION',
                title: m.name,
                status: m.isActive ? 'STARTED' : 'STOPPED',
                timestamp: m.isActive ? m.startedAt : (m as any).updatedAt,
                details: `${m.defaultDose} ${m.route} ${m.frequency || ''}`
            });
        });

        // 2. Process Orders
        orders.forEach(o => {
            timeline.push({
                id: o.id,
                type: 'ORDER',
                title: o.title,
                status: o.status,
                timestamp: o.updatedAt,
                details: o.notes
            });
        });

        // 3. Process Consultations
        consults.forEach(c => {
            timeline.push({
                id: c.id,
                type: 'CONSULTATION',
                title: `Consultation: ${c.specialty}`,
                status: 'COMPLETED',
                timestamp: c.timestamp,
                details: `Dr. ${c.doctorName}`
            });
        });

        // 4. Process Notes
        notes.forEach(n => {
            timeline.push({
                id: n.id,
                type: 'NOTE',
                title: n.title,
                status: 'ADDED',
                timestamp: n.createdAt,
                details: n.content.substring(0, 100) + (n.content.length > 100 ? '...' : '')
            });
        });

        // 5. Process Labs
        labs.forEach(l => {
            timeline.push({
                id: l.id,
                type: 'INVESTIGATION',
                title: l.title,
                status: l.status,
                timestamp: (l as any).updatedAt,
                details: l.impression
            });
        });

        // Sort by timestamp descending
        timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        res.json(timeline.slice(0, 20)); // Return top 20 events
    } catch (error) {
        console.error("Timeline error:", error);
        res.status(500).json({ error: 'Failed to fetch timeline' });
    }
});

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


// GET consultations
router.get('/:id/consultations', async (req, res) => {
    try {
        const { id } = req.params;
        const consultations = await prisma.consultation.findMany({
            where: { patientId: id },
            orderBy: { timestamp: 'desc' }
        });
        res.json(consultations);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch consultations' });
    }
});

// CREATE consultation
router.post('/:id/consultations', async (req, res) => {
    try {
        const { id } = req.params;
        const { doctorName, specialty, imageUrl, notes, authorId, orderId } = req.body;

        const consultation = await prisma.consultation.create({
            data: {
                patientId: id,
                authorId: authorId,
                doctorName,
                specialty,
                imageUrl,
                notes,
                orderId: orderId || undefined,
                timestamp: new Date()
            } as any
        });

        // If this consultation is linked to an order, complete the order
        if (orderId) {
            await prisma.clinicalOrder.update({
                where: { id: orderId },
                data: { status: 'COMPLETED' }
            });
        }

        res.status(201).json(consultation);
    } catch (error) {
        console.error("Error creating consultation:", error);
        res.status(500).json({ error: 'Failed to create consultation' });
    }
});

export default router;
