import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

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
                    include: { user: true }
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
router.post('/catalog', async (req, res) => {
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
router.delete('/catalog/:id', async (req, res) => {
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
        const { name, dose, route, frequency, infusionRate, otherInstructions, patientId, startedAt } = req.body;

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
        res.json(prescription);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to prescribe medication' });
    }
});

// POST /administer
router.post('/administer', async (req, res) => {
    try {
        const { patientId, medicationId, status, dose, userId } = req.body;

        if (!userId) {
            console.warn("Administer called without userId");
        }

        const dilutionValue = req.body.dilution ? parseFloat(req.body.dilution) : null;

        const admin = await prisma.medicationAdministration.create({
            data: {
                patientId,
                medicationId,
                status,
                dose,
                dilution: dilutionValue,
                userId: userId || undefined, // Nurse ID
                timestamp: new Date()
            }
        });

        // 1. Handle "Once Only" frequency auto-discontinue
        if (status === 'Given') {
            const med = await prisma.medication.findUnique({
                where: { id: medicationId }
            });
            if (med && med.frequency?.includes('Once Only')) {
                await prisma.medication.update({
                    where: { id: medicationId },
                    data: {
                        isActive: false,
                        discontinuedAt: new Date()
                    } as any
                });
            }
        }

        // 2. Automatically create IO Input if there's a dilution volume
        if (dilutionValue && dilutionValue > 0) {
            // Get medication name for category (already fetched if Once Only, otherwise fetch)
            const med = await prisma.medication.findUnique({ where: { id: medicationId } });
            if (med) {
                await prisma.intakeOutput.create({
                    data: {
                        patientId,
                        userId: userId || 'system', // Fallback to avoid error if missing
                        type: 'INPUT',
                        category: `Medication: ${med.name}`,
                        amount: dilutionValue,
                        notes: `Auto-recorded from MAR administration (Dose: ${dose || '1'})`,
                        timestamp: new Date(),
                        status: 'APPROVED'
                    } as any
                });
            }
        }

        res.json(admin);
    } catch (error) {
        console.error("Administer Error:", error);
        res.status(500).json({ error: 'Failed to administer' });
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
            data: { isActive }
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
        const userId = req.headers['x-user-id'] as string;

        if (!userId) {
            return res.status(401).json({ error: 'User ID is required' });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.role !== 'SENIOR') {
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
