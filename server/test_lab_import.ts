import dotenv from 'dotenv';
dotenv.config();
import { LabImportService } from './src/services/labImportService';
import { ocrService } from './src/services/ocrService';

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
            const targetPatient = patients.find((p: any) => p.name.includes('حكمت')) || patients[0];
            console.log(`Testing import for patient: ${targetPatient.name} (${targetPatient.date})`);

            const result = await service.importReport(username, password, targetPatient);
            console.log("Screenshot saved to:", result.screenshotPath);

            console.log("Running OCR Analysis...");
            const ocrResult = await ocrService.analyzeImage(result.screenshotPath);
            console.log("OCR Success! Extracted items count:", ocrResult.length);
            console.log("Sample format:", JSON.stringify(ocrResult[0]).substring(0, 100) + '...');
        } else {
            console.log("No patients found to test import.");
        }

    } catch (e) {
        console.error("Test Failed:", e);
    }
}

run();
