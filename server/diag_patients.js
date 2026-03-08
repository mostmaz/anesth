const { LabImportService } = require('./dist/services/labImportService');
const service = new LabImportService();

async function run() {
    const username = 'icu@amrlab.net';
    const password = process.env.LAB_PASSWORD || '1989';

    try {
        console.log(`Fetching patients for ${username}...`);
        const patients = await service.getPatients(username, password, true);
        console.log(`Found ${patients.length} records.`);

        const target = patients.filter(p => p.name.includes('حكمت'));
        console.log("Matches: ", JSON.stringify(target, null, 2));

    } catch (e) {
        console.error("Test failed:", e);
    }
}

run();
