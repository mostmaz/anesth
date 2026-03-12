import { PrismaClient } from '@prisma/client';
import { LabImportService } from './src/services/labImportService';

const prisma = new PrismaClient();

async function run() {
    console.log("Starting targeted import test for: نوري فيصل حما قاسكي");
    const service = new LabImportService();

    try {
        const patient = await prisma.patient.findFirst({
            where: {
                name: {
                    contains: 'نوري',
                    mode: 'insensitive'
                }
            }
        });

        if (!patient) {
            console.log("Patient not found in local DB.");
            return;
        }

        console.log("Found patient in local DB:", patient.name, patient.mrn);

        console.log("Triggering explicit sync...");
        const results = await service.syncAndSavePatientLabs(
            patient.mrn,
            patient.id,
            'test-script',
            patient.name
        );

        console.log(`Sync completed. Imported ${results.length} new reports.`);
        if (results.length > 0) {
            console.log("Imported Details:");
            results.forEach((r, i) => console.log(`${i + 1}. ${r.investigation.title} - File: ${r.investigation.imageUrl}`));
        } else {
            console.log("No new reports imported. Either no match was found on the portal, or the reports were already imported.");
        }
    } catch (e) {
        console.error("Test Failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
