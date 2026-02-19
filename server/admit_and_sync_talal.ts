
const { PrismaClient } = require('@prisma/client');
const { LabImportService } = require('./src/services/labImportService');

const prisma = new PrismaClient();
const labService = new LabImportService();

async function run() {
    try {
        console.log("Finding patient 139494...");
        const patient = await prisma.patient.findUnique({
            where: { mrn: '139494' }
        });

        if (!patient) {
            console.error("Patient not found!");
            return;
        }

        console.log(`Found patient: ${patient.firstName} ${patient.lastName}`);

        // Check active admission
        const activeAdmission = await prisma.admission.findFirst({
            where: {
                patientId: patient.id,
                dischargedAt: null
            }
        });

        if (activeAdmission) {
            console.log("Patient already has active admission.");
        } else {
            console.log("Creating new admission...");
            await prisma.admission.create({
                data: {
                    patientId: patient.id,
                    admittedAt: new Date(),
                    bed: 'Bed 1'
                }
            });
            console.log("Admission created.");
        }

        console.log("Triggering Sync...");
        const results = await labService.syncAndSavePatientLabs(patient.mrn, patient.id, 'mock-nurse-id');
        console.log(`Sync completed. Imported ${results.length} investigations.`);
        console.log(JSON.stringify(results, null, 2));

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
