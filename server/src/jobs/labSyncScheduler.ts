import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { LabImportService } from '../services/labImportService';

const prisma = new PrismaClient();
const labService = new LabImportService();

export function startLabSyncJob() {
    console.log("Lab Sync Scheduler DISABLED (manual sync only to preserve API quota)");

    // DISABLED: Automatic syncing consumes Gemini API free tier quota too quickly.
    // To re-enable, uncomment the cron.schedule block below.
    // Users can still manually sync via the "Sync Reports" button in the UI.
    return;

    // Schedule: 0 * * * * (At minute 0 past every hour)
    cron.schedule('0 * * * *', async () => {
        console.log(`[Cron] Running Lab Sync Job at ${new Date().toISOString()}`);

        try {
            // Find admitted patients: those with an active admission (dischargedAt is null)
            const admittedPatients = await prisma.patient.findMany({
                where: {
                    admissions: {
                        some: {
                            dischargedAt: null
                        }
                    }
                }
            });

            console.log(`[Cron] Found ${admittedPatients.length} admitted patients.`);

            // Use a default system user ID for automated imports if needed, or stick to mock
            const SYSTEM_USER_ID = 'mock-nurse-id';

            for (const patient of admittedPatients) {
                if (!patient.mrn) continue;

                console.log(`[Cron] Syncing labs for Patient: ${patient.name} (MRN: ${patient.mrn})`);

                try {
                    const results = await labService.syncAndSavePatientLabs(patient.mrn, patient.id, SYSTEM_USER_ID);
                    if (results.length > 0) {
                        console.log(`[Cron] Successfully imported ${results.length} new reports for ${patient.mrn}`);
                    } else {
                        console.log(`[Cron] No new reports for ${patient.mrn}`);
                    }
                } catch (err) {
                    console.error(`[Cron] Failed to sync for ${patient.mrn}:`, err);
                }

                // Wait 5 seconds between patients to be nice to the external server
                await new Promise(resolve => setTimeout(resolve, 5000));
            }

            console.log(`[Cron] Lab Sync Job Completed.`);

        } catch (error) {
            console.error("[Cron] Lab Sync Job Failed:", error);
        }
    });
}
