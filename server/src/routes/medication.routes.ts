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

// POST /prescribe - Add new medication to patient
router.post('/prescribe', async (req, res) => {
    try {
        const { name, dose, route, frequency, infusionRate, otherInstructions, patientId } = req.body;

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
                patientId
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

        const admin = await prisma.medicationAdministration.create({
            data: {
                patientId,
                medicationId,
                status,
                dose,
                userId: userId || undefined, // Nurse ID
                timestamp: new Date()
            }
        });
        res.json(admin);
    } catch (error) {
        console.error("Administer Error:", error);
        res.status(500).json({ error: 'Failed to administer' });
    }
});

export default router;
