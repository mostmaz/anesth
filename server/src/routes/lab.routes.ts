
import { Router } from 'express';
import { LabImportService } from '../services/labImportService';
import { PrismaClient } from '@prisma/client';

const router = Router();
const labService = new LabImportService();
const prisma = new PrismaClient();

import { ocrService } from '../services/ocrService';

router.get('/patients', async (req, res) => {
    try {
        // Hardcoded credentials for now as per user request
        const username = '10427';
        const password = process.env.LAB_PASSWORD || '7358782';
        const force = req.query.refresh === 'true';

        const patients = await labService.getPatients(username, password, force);
        res.json({ success: true, data: patients });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch patients', error: String(error) });
    }
});

// Manual Sync Trigger
router.post('/sync-all', async (req, res) => {
    try {
        console.log("Manual Sync All triggered");

        // Find admitted patients
        const admittedPatients = await prisma.patient.findMany({
            where: {
                admissions: {
                    some: {
                        dischargedAt: null
                    }
                }
            }
        });

        console.log(`[Manual Sync] Found ${admittedPatients.length} admitted patients.`);
        const results = [];

        // Trigger async process but return immediately or wait?
        // User probably wants to know it started. Waiting for all might time out.
        // Let's run it in background but acknowledge start.

        // However, for "Sync All Button", user might want to see progress.
        // Let's do a few prominently and return, or run all and return summary if list is small.
        // Given typically < 20 ICU patients, we can try to await it, but timeout is risk.
        // Better: Return "Started" and let sockets/polling handle updates? 
        // For now, let's await it but set a timeout race?
        // No, let's just trigger it and return "Sync started in background".

        // Actually, user said "i need this also to be done with sync all button also".
        // He likely wants the same behavior as the cron job but on demand.

        // Refactored logic from scheduler could be imported but for now duplicating is safer/faster
        // to avoid breaking the scheduler file structure.

        (async () => {
            const SYSTEM_USER_ID = req.body.userId || 'manual-sync-admin';
            for (const patient of admittedPatients) {
                if (!patient.mrn) continue;
                try {
                    await labService.syncAndSavePatientLabs(patient.mrn, patient.id, SYSTEM_USER_ID);
                } catch (e) {
                    console.error(`Manual sync failed for ${patient.mrn}`, e);
                }
                // Small delay
                await new Promise(r => setTimeout(r, 2000));
            }
            console.log("Manual Sync All Completed");
        })();

        res.json({ success: true, message: `Sync started for ${admittedPatients.length} patients.` });

    } catch (error) {
        console.error("Error triggering sync:", error);
        res.status(500).json({ success: false, message: 'Failed to trigger sync' });
    }
});

router.post('/import', async (req, res) => {
    try {
        const { patient } = req.body;
        if (!patient) return res.status(400).json({ success: false, message: 'Patient data required' });

        const username = '10427';
        const password = process.env.LAB_PASSWORD || '7358782';

        // 1. Get Screenshot
        const { screenshotPath } = await labService.importReport(username, password, patient);

        // 2. Analyze with AI
        const analysisResults = await ocrService.analyzeImage(screenshotPath);

        res.json({ success: true, data: analysisResults, screenshotPath });

    } catch (error) {
        console.error("Import Error:", error);
        res.status(500).json({ success: false, message: 'Failed to import report', error: String(error) });
    }
});

router.post('/sync', async (req, res) => {
    try {
        const { patientId, mrn, name, authorId } = req.body;
        if (!patientId || !mrn) return res.status(400).json({ success: false, message: 'Patient ID and MRN required' });

        const results = await labService.syncAndSavePatientLabs(mrn, patientId, authorId || 'mock-nurse-id');

        res.json({ success: true, count: results.length, data: results });

    } catch (error) {
        console.error("Sync Error:", error);
        res.status(500).json({ success: false, message: 'Failed to sync reports', error: String(error) });
    }
});

export default router;
