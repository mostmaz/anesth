
const { LabImportService } = require('./dist/services/labImportService');
const service = new LabImportService();
const patientId = '8b0b885c-e27a-454c-bdc8-7ecd85bb96ad';
const authorId = 'system-debug';
const patientName = 'هاشم ياسين خليل يونس';
const mrn = '325400-3';

async function run() {
    console.log('--- STARTING MANUAL SYNC FOR HASHIM (8b0b885c) ---');
    try {
        const results = await service.syncAndSavePatientLabs(mrn, patientId, authorId, patientName);
        console.log('Sync completed. Results:', JSON.stringify(results, null, 2));
    } catch (err) {
        console.error('Sync failed:', err);
    }
}
run();
