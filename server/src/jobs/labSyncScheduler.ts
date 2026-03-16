import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { LabImportService } from '../services/labImportService';

const prisma = new PrismaClient();
const labService = new LabImportService();

export function startLabSyncJob() {
    console.log("Lab Sync Scheduler Enabled (Every 2 hours)");

    // Schedule: 0 */2 * * * (At minute 0 past every 2nd hour)
    cron.schedule('0 */2 * * *', async () => {
        console.log(`[Cron] Running Lab Sync Job at ${new Date().toISOString()}`);

        try {
            await labService.syncAllActivePatients('system-cron');
            console.log(`[Cron] Lab Sync Job Completed.`);
        } catch (error) {
            console.error("[Cron] Lab Sync Job Failed:", error);
        }
    });
}
