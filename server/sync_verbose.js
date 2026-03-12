
const { LabImportService } = require('./dist/services/labImportService');
const fs = require('fs');
require('dotenv').config();

async function runVerboseSync() {
    const service = new LabImportService();
    const logFile = '/app/uploads/sync_debug_log.txt';
    const log = (msg) => {
        const text = `[${new Date().toISOString()}] ${msg}\n`;
        process.stdout.write(text);
        fs.appendFileSync(logFile, text);
    };

    log('--- STARTING VERBOSE SYNC FOR HASHIM ---');
    try {
        const results = await service.syncAndSavePatientLabs(
            '8b0b885c',
            '8b0b885c-4321-4d33-9111-20934123123', // Dummy ID but MRN is searched
            'manual-debug',
            'هاشم ياسين خليل يونس'
        );
        log(`Sync success: ${results.length} results.`);
    } catch (err) {
        log(`Sync failed: ${err.message}\n${err.stack}`);
    }
}

runVerboseSync().catch(console.error);
