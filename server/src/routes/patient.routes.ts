import { Router } from 'express';
import prisma from '../prisma';
import { requireRole } from '../middleware/auth';
import { broadcastNotification } from './notifications.routes';
import { notifyPatient, sendToAll } from '../services/pushService';
import { recordPatientView } from '../middleware/audit';
import { BadRequest, optionalNumber, requiredString, sendError } from '../lib/validate';
import { PATIENT_LIMITS } from '../shared/ranges';
import { cleanAllergyList } from '../shared/allergy';

// Weight, height and allergies from a request body. Only the fields that were
// sent are returned, so an update that omits them leaves them unchanged.
function patientBasics(body: any) {
    const data: {
        weightKg?: number | null; heightCm?: number | null; allergies?: string[]; noKnownAllergies?: boolean;
    } = {};
    if (body.weightKg !== undefined) data.weightKg = optionalNumber(body.weightKg, PATIENT_LIMITS.weightKg);
    if (body.heightCm !== undefined) data.heightCm = optionalNumber(body.heightCm, PATIENT_LIMITS.heightCm);
    if (body.allergies !== undefined) data.allergies = cleanAllergyList(body.allergies);
    if (body.noKnownAllergies !== undefined) data.noKnownAllergies = body.noKnownAllergies === true || body.noKnownAllergies === 'true';
    // "No known allergies" cannot stand next to a list of allergies.
    if (data.allergies && data.allergies.length) data.noKnownAllergies = false;
    return data;
}

const router = Router();

// GET all patients
router.get('/', async (req, res) => {
    try {
        const { userId } = req.query;
        const where: any = {};

        if (userId) {
            where.assignments = {
                some: {
                    userId: String(userId),
                    isActive: true
                }
            };
        }

        const patients = await prisma.patient.findMany({
            where,
            include: {
                admissions: {
                    include: { doctor: true, specialty: true }
                },
                assignments: {
                    where: { isActive: true },
                    include: { user: { select: { id: true, name: true, role: true } } }
                }
            }
        });
        res.json(patients);
    } catch (error) {
        console.error("Error fetching patients:", error);
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
        recordPatientView(req, id);
        res.json(patient);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch patient' });
    }
});

// CREATE patient
router.post('/', async (req, res) => {
    try {
        const { gender, diagnosis, comorbidities, doctorId, specialtyId } = req.body;
        const name = requiredString(req.body.name, 'Name', 200);
        const mrn = requiredString(req.body.mrn, 'MRN', 60);
        const dob = new Date(req.body.dob);
        if (isNaN(dob.getTime()) || dob.getTime() > Date.now()) throw new BadRequest('Date of birth is not valid');

        // 1. Create Patient
        const patient = await prisma.patient.create({
            data: {
                name,
                mrn,
                dob,
                gender,
                diagnosis,
                comorbidities,
                ...patientBasics(req.body),
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
        const orderAuthorId = req.user!.id;

        if (orderAuthorId) {
            // 2. Admit to HAMSA
            await prisma.clinicalOrder.create({
                data: {
                    patientId: patient.id,
                    authorId: orderAuthorId,
                    type: 'NURSING',
                    status: 'APPROVED',
                    approverId: orderAuthorId,
                    priority: 'ROUTINE',
                    title: 'Admit Patient in HAMSA System',
                    details: { instruction: 'Please complete admission in HAMSA hospital system to ICU' }
                }
            });

            // 3. Charge for ICU Stay
            await prisma.clinicalOrder.create({
                data: {
                    patientId: patient.id,
                    authorId: orderAuthorId,
                    type: 'PROTOCOL',
                    status: 'APPROVED',
                    approverId: orderAuthorId,
                    priority: 'ROUTINE',
                    title: 'Charge the patient for ICU Stay',
                    details: { instruction: 'Ensure ICU daily charges are applied' }
                }
            });

            // 4. Clexane
            await prisma.clinicalOrder.create({
                data: {
                    patientId: patient.id,
                    authorId: orderAuthorId,
                    type: 'MEDICATION',
                    status: 'APPROVED',
                    approverId: orderAuthorId,
                    priority: 'ROUTINE',
                    title: 'Clexane',
                    details: { dose: '40mg', route: 'SC', frequency: 'Once daily' }
                }
            });

            // 5. Omeprazole
            await prisma.clinicalOrder.create({
                data: {
                    patientId: patient.id,
                    authorId: orderAuthorId,
                    type: 'MEDICATION',
                    status: 'APPROVED',
                    approverId: orderAuthorId,
                    priority: 'ROUTINE',
                    title: 'Omeprazole',
                    details: { dose: '40mg', route: 'IV', frequency: 'Once daily' }
                }
            });

            // 6. Feeding (Day 2)
            const day2 = new Date();
            day2.setDate(day2.getDate() + 1); // Tomorrow = Day 2 of admission range
            await prisma.clinicalOrder.create({
                data: {
                    patientId: patient.id,
                    authorId: orderAuthorId,
                    type: 'DIET',
                    status: 'APPROVED',
                    approverId: orderAuthorId,
                    priority: 'ROUTINE',
                    title: 'Start Feeding',
                    details: { instruction: 'Begin enteral feeding as per protocol' },
                    // @ts-ignore
                    reminderAt: day2
                }
            });
        }

        broadcastNotification('new_admission', {
            patientId: patient.id,
            patientName: patient.name,
            mrn: patient.mrn,
            diagnosis: patient.diagnosis,
            message: `New admission: ${patient.name} (MRN: ${patient.mrn})`
        });
        sendToAll('New admission', `${patient.name} (MRN ${patient.mrn}) admitted to ICU`, { type: 'new_admission', patientId: patient.id });

        res.locals.auditPatientId = patient.id;
        res.status(201).json(patient);
    } catch (error) {
        if ((error as any)?.code === 'P2002') return res.status(409).json({ error: 'A patient with this MRN already exists' });
        sendError(res, error, 'Failed to create patient');
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
                comorbidities,
                ...patientBasics(req.body)
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
        sendError(res, error, 'Failed to update patient');
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
            const dp = await prisma.patient.findUnique({ where: { id }, select: { name: true, mrn: true } });
            notifyPatient(id, 'team', 'Patient discharged', `${dp?.name || 'Patient'} (MRN ${dp?.mrn || '—'}) has been discharged`, { type: 'discharge' });
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

router.delete('/:id', requireRole('SENIOR'), async (req, res) => {
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
        const { doctorName, specialty, imageUrl, notes, orderId } = req.body;

        const consultation = await prisma.consultation.create({
            data: {
                patientId: id,
                authorId: req.user!.id,
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

        const cp = await prisma.patient.findUnique({ where: { id }, select: { name: true } });
        notifyPatient(id, 'team', 'New consultation', `${specialty} consult added for ${cp?.name || 'patient'} by ${doctorName}`, { type: 'new_consultation' });

        res.status(201).json(consultation);
    } catch (error) {
        console.error("Error creating consultation:", error);
        res.status(500).json({ error: 'Failed to create consultation' });
    }
});

export default router;
