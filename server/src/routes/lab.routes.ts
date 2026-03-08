
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
        const username = 'icu@amrlab.net';
        const password = process.env.LAB_PASSWORD || '1989';
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
        const SYSTEM_USER_ID = req.body.userId || 'manual-sync-admin';

        // Run in background using the new auto-sync logic
        labService.syncAllActivePatients(SYSTEM_USER_ID).catch(console.error);

        res.json({ success: true, message: `Sync started in background.` });
    } catch (error) {
        console.error("Error triggering sync:", error);
        res.status(500).json({ success: false, message: 'Failed to trigger sync' });
    }
});

router.post('/import', async (req, res) => {
    try {
        const { patient } = req.body;
        if (!patient) return res.status(400).json({ success: false, message: 'Patient data required' });

        const username = 'icu@amrlab.net';
        const password = process.env.LAB_PASSWORD || '1989';

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

        const results = await labService.syncAndSavePatientLabs(mrn, patientId, authorId || 'mock-nurse-id', name);

        res.json({ success: true, count: results.length, data: results });

    } catch (error) {
        console.error("Sync Error:", error);
        res.status(500).json({ success: false, message: 'Failed to sync reports', error: String(error) });
    }
});

export default router;
