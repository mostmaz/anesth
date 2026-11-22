import { Router } from 'express';
import prisma from '../prisma';
import { requireRole } from '../middleware/auth';
import { BadRequest, optionalString, requiredString, sendError } from '../lib/validate';
import { allergyWarnings } from '../shared/allergy';

const router = Router();

// Paused / Resumed are used for infusions.
const ADMINISTRATION_STATUSES = ['Given', 'Held', 'NotGiven', 'Missed', 'Withheld', 'Scheduled', 'Paused', 'Resumed'];

// GET /:patientId/mar - Get active medications (prescriptions) for a patient
router.get('/:patientId/mar', async (req, res) => {
    try {
        const { patientId } = req.params;
        // Fetch medications linked to patient (Prescriptions)
        const medications = await prisma.medication.findMany({
            where: { patientId },
            include: {
                administrations: {
                    orderBy: { timestamp: 'desc' },
                    take: 200, // Get recent admin history (7 days approx)
                    // Name and role only — never the whole account record.
                    include: { user: { select: { id: true, name: true, role: true } } }
                }
            }
        });
        res.json(medications);
    } catch (error) {
        console.error("MAR Fetch Error:", error);
        res.status(500).json({ error: 'Failed to fetch MAR' });
    }
});

// GET /catalog - Search drugs
router.get('/catalog', async (req, res) => {
    try {
        const { q } = req.query;
        const where = q ? { name: { contains: String(q), mode: 'insensitive' as const } } : {};
        const drugs = await prisma.drugCatalog.findMany({
            where,
            take: 20,
            orderBy: { name: 'asc' }
        });
        res.json(drugs);
    } catch (error) {
        res.status(500).json({ error: "Catalog search failed" });
    }
});

// POST /catalog - Add new drug to catalog
router.post('/catalog', requireRole('SENIOR'), async (req, res) => {
    try {
        const { name, defaultDose, defaultRoute } = req.body;
        const drug = await prisma.drugCatalog.create({
            data: { name, defaultDose, defaultRoute }
        });
        res.json(drug);
    } catch (error) {
        res.status(500).json({ error: "Failed to add drug" });
    }
});

// DELETE /catalog/:id - Remove drug from catalog
router.delete('/catalog/:id', requireRole('SENIOR'), async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.drugCatalog.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete drug" });
    }
});

// POST /prescribe - Add new medication to patient
router.post('/prescribe', async (req, res) => {
    try {
        const { frequency, infusionRate, otherInstructions, startedAt } = req.body;
        const name = requiredString(req.body.name, 'Drug name', 120);
        const dose = requiredString(req.body.dose, 'Dose', 120);
        const route = requiredString(req.body.route, 'Route', 40);
        const patientId = requiredString(req.body.patientId, 'Patient');

        // 1. Ensure in Catalog (Auto-add)
        // Check if exists first to avoid unique constraint if race condition, though upsert handles it.
        try {
            await prisma.drugCatalog.upsert({
                where: { name },
                update: {},
                create: {
                    name,
                    defaultDose: dose,
                    defaultRoute: route
                }
            });
        } catch (e) {
            // Ignore catalog creation errors (e.g. duplicate key race types)
            console.warn("Catalog upsert warning:", e);
        }

        // 2. Create Prescription
        const prescription = await prisma.medication.create({
            data: {
                name,
                defaultDose: dose,
                route,
                frequency,
                infusionRate,
                otherInstructions,
                patientId,
                dilution: req.body.dilution ? parseFloat(req.body.dilution) : null,
                // @ts-ignore
                durationReminder: req.body.durationReminder ? parseInt(req.body.durationReminder, 10) : null,
                startedAt: startedAt ? new Date(startedAt) : undefined
            }
        });
        // Tell the prescriber if the drug matches a recorded allergy (the apps
        // also warn before saving; this covers an allergy added in the meantime).
        const patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { allergies: true } });
        res.json({ ...prescription, allergyWarnings: allergyWarnings(name, patient?.allergies) });
    } catch (error) {
        sendError(res, error, 'Failed to prescribe medication');
    }
});

// POST /administer
router.post('/administer', async (req, res) => {
    try {
        const { patientId, medicationId, dose, administeredAt } = req.body;
        if (!patientId || !medicationId) throw new BadRequest('Patient and medication are required');
        const status = String(req.body.status || '');
        if (!ADMINISTRATION_STATUSES.includes(status)) throw new BadRequest('Unknown administration status');
        // The entry is signed by whoever is signed in, not by an id in the request.
        const userId = req.user!.id;

        const dilutionValue = req.body.dilution ? parseFloat(req.body.dilution) : null;

        // Late entries: the drug may have been given at the bedside before it was charted,
        // so the client can back-date the actual give time — but only within the last 24h
        // and never into the future (5 min clock-skew allowance). chartedAt keeps the audit.
        const now = new Date();
        let actualTime = now;
        if (administeredAt) {
            const parsed = new Date(administeredAt);
            if (!isNaN(parsed.getTime())
                && parsed.getTime() <= now.getTime() + 5 * 60 * 1000
                && parsed.getTime() >= now.getTime() - 24 * 60 * 60 * 1000) {
                actualTime = parsed;
            }
        }

        const admin = await prisma.medicationAdministration.create({
            data: {
                patientId,
                medicationId,
                status,
                dose,
                dilution: dilutionValue,
                userId,
                timestamp: actualTime,
                chartedAt: now
            }
        });

        if (status === 'Given') {
            const med = await prisma.medication.findUnique({
                where: { id: medicationId }
            });

            // 1. Handle "Once Only" frequency auto-discontinue
            if (med && med.frequency?.includes('Once Only')) {
                await prisma.medication.update({
                    where: { id: medicationId },
                    data: {
                        isActive: false,
                        discontinuedAt: new Date()
                    } as any
                });
            }

            // 2. IV drugs: the dilution volume entered at administration is a fluid intake,
            // so record it as an I/O Input. Infusion-route drugs are excluded — their intake
            // is derived from the ml/hr rates charted in the vitals records instead (so they
            // don't double-count).
            if (med && med.route === 'IV' && dilutionValue && dilutionValue > 0) {
                await prisma.intakeOutput.create({
                    data: {
                        patientId,
                        userId,
                        type: 'INPUT',
                        category: `IV · ${med.name}`,
                        amount: dilutionValue,
                        notes: `Dilution volume from MAR administration${dose ? ` (${dose})` : ''}`,
                        timestamp: new Date(),
                        status: 'APPROVED'
                    } as any
                });
            }
        }

        res.json(admin);
    } catch (error) {
        sendError(res, error, 'Failed to administer');
    }
});

// PUT /:id - Edit an existing medication order
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { dose, route, frequency, infusionRate, otherInstructions } = req.body;

        const updated = await prisma.medication.update({
            where: { id },
            data: {
                defaultDose: dose,
                route,
                frequency,
                infusionRate,
                otherInstructions,
                dilution: req.body.dilution ? parseFloat(req.body.dilution) : null
            }
        });
        res.json(updated);
    } catch (error) {
        console.error("Edit Medication Error:", error);
        res.status(500).json({ error: 'Failed to edit medication' });
    }
});

// PUT /:id/status - Update active status (Discontinue)
router.put('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;

        const updated = await prisma.medication.update({
            where: { id },
            data: { isActive: !!isActive, discontinuedAt: isActive ? null : new Date() }
        });
        res.json(updated);
    } catch (error) {
        console.error("Update Medication Status Error:", error);
        res.status(500).json({ error: 'Failed to update medication status' });
    }
});

// DELETE /administration/:id - Delete an administration (requires SENIOR checking)
router.delete('/administration/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (req.user?.role !== 'SENIOR') {
            return res.status(403).json({ error: 'Only a SENIOR can delete an administration record' });
        }

        await prisma.medicationAdministration.delete({
            where: { id }
        });
        res.json({ success: true });
    } catch (error) {
        console.error("Delete Administration Error:", error);
        res.status(500).json({ error: 'Failed to delete administration' });
    }
});

export default router;
