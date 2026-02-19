
const { PrismaClient } = require('@prisma/client');
const { LabImportService } = require('./src/services/labImportService');

const prisma = new PrismaClient();
const labService = new LabImportService();

async function run() {
    try {
        console.log("Finding patient by existing MRN 139494...");
        let patient = await prisma.patient.findUnique({
            where: { mrn: '139494' }
        });

        if (!patient) {
            console.log("Patient 139494 not found. Trying to find by name 'Talal Mallallah'...");
            // Search by name if MRN already changed or incorrect
            const patients = await prisma.patient.findMany({
                where: {
                    firstName: { contains: 'Talal', mode: 'insensitive' },
                    lastName: { contains: 'Mallallah', mode: 'insensitive' }
                }
            });
            if (patients.length > 0) patient = patients[0];
        }

        if (!patient) {
            console.error("Patient not found!");
            return;
        }

        console.log(`Found patient: ${patient.firstName} ${patient.lastName} (Current MRN: ${patient.mrn})`);

        const NEW_MRN = '322637-3';

        if (patient.mrn !== NEW_MRN) {
            console.log(`Updating MRN to ${NEW_MRN} to match Lab System...`);
            patient = await prisma.patient.update({
                where: { id: patient.id },
                data: { mrn: NEW_MRN }
            });
            console.log("MRN Updated.");
        } else {
            console.log("MRN matches targeted Lab MRN.");
        }

        console.log("Triggering Sync with new MRN...");
        const results = await labService.syncAndSavePatientLabs(patient.mrn, patient.id, 'mock-nurse-id');
        console.log(`Sync completed. Imported ${results.length} investigations.`);

        if (results.length > 0) {
            console.log("Imports:");
            results.forEach((r: any) => console.log(`- ${r.title} (ID: ${r.id})`));
        }

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
