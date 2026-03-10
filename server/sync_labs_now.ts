import 'dotenv/config';
import { LabImportService } from './src/services/labImportService';

async function runSync() {
    console.log("Starting immediate Lab Sync...");
    const labService = new LabImportService();

    try {
        const results = await labService.syncAllActivePatients('manual-trigger-script');
        console.log("Sync process finished.");
        console.log(`Summary: Imported ${results.length} new records.`);
    } catch (error) {
        console.error("Sync failed with error:", error);
    } finally {
        // The service uses Prisma internally, which handles its own connections, 
        // but we might need to ensure the process exits if there are lingering connections.
        process.exit(0);
    }
}

runSync();
