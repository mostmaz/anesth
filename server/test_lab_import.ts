
import { LabImportService } from './src/services/labImportService';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    console.log("Starting test...");
    const service = new LabImportService();
    // Use the hardcoded creds from routes or env
    const username = '10427';
    const password = process.env.LAB_PASSWORD || '7358782';

    try {
        console.log(`Attempting login with ${username}...`);
        const patients = await service.getPatients(username, password);
        console.log(`Success! Found ${patients.length} patients.`);

        if (patients.length > 0) {
            const targetPatient = patients[0];
            console.log(`Testing import for patient: ${targetPatient.name} (${targetPatient.date})`);

            const result = await service.importReport(username, password, targetPatient);
            console.log("Import Success!");
            console.log("Screenshot saved to:", result.screenshotPath);
        } else {
            console.log("No patients found to test import.");
        }

    } catch (e) {
        console.error("Test Failed:", e);
    }
}

run();
