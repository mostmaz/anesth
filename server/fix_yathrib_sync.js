require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { LabImportService } = require('./dist/services/labImportService');

const prisma = new PrismaClient();

async function cleanAndSyncYathrib() {
    try {
        console.log("Looking up patient...");
        const patient = await prisma.patient.findFirst({
            where: { name: { contains: 'يثرب' } }
        });

        if (!patient) {
            console.log("Patient not found in DB.");
            return;
        }

        console.log(`Found patient: ${patient.name} (${patient.mrn})`);

        console.log("Wiping existing LAB investigations for this patient...");
        const delResult = await prisma.investigation.deleteMany({
            where: {
                patientId: patient.id,
                type: 'LAB'
            }
        });
        console.log(`Deleted ${delResult.count} faulty records.`);

        console.log("Running fresh sync...");
        const scraper = new LabImportService();
        // Since we are running ad-hoc, author ID can just be empty or system
        const results = await scraper.syncAndSavePatientLabs(patient.mrn, patient.id, 'system', patient.name);

        console.log(`Sync complete. Imported ${results.length} records.`);
        results.forEach(r => {
            console.log(`- ${r.title} | ${r.status}`);
        });

    } catch (e) {
        console.error("Error during clean/sync:", e);
    } finally {
        await prisma.$disconnect();
    }
}

cleanAndSyncYathrib();
