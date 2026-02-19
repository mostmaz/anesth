
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const patientMrn = '139494';
        console.log(`Checking patient with MRN: ${patientMrn}`);

        const patient = await prisma.patient.findUnique({
            where: { mrn: patientMrn },
            include: { admissions: true }
        });

        if (!patient) {
            console.log("Patient not found.");
            return;
        }

        console.log(`Found Patient: ${patient.name} (${patient.id})`);
        console.log("Admissions:", JSON.stringify(patient.admissions, null, 2));

        const activeAdmission = await prisma.admission.findFirst({
            where: {
                patientId: patient.id,
                dischargedAt: null
            }
        });

        if (activeAdmission) {
            console.log(`Active Admission Found: ${activeAdmission.id}`);

            // Simulate Discharge
            console.log("Attempting to discharge...");
            const updated = await prisma.admission.update({
                where: { id: activeAdmission.id },
                data: { dischargedAt: new Date() }
            });
            console.log("Discharge Successful:", updated);

        } else {
            console.log("No active admission found.");

            // Check if there are ANY admissions
            const allAdmissions = await prisma.admission.findMany({
                where: { patientId: patient.id }
            });
            if (allAdmissions.length === 0) {
                console.log("Patient has NO admissions at all.");
            } else {
                console.log("All admissions are already discharged.");
            }
        }

    } catch (error) {
        console.error("Error during debug:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
