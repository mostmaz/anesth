const { LabImportService } = require('./src/services/labImportService');
const service = new LabImportService();

async function run() {
    const username = '10427'; // Hardcoded for diagnostic
    const password = process.env.LAB_PASSWORD || '7358782';

    try {
        console.log("Fetching patients...");
        const patients = await service.getPatients(username, password, true);
        console.log(`Found ${patients.length} records.`);

        const target = patients.filter(p => p.name.includes('حكمت'));
        console.log("Matches for 'حكمت':", JSON.stringify(target, null, 2));

    } catch (e) {
        console.error("Test failed:", e);
    }
}

run();
