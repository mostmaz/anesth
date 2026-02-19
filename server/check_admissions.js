
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const patients = await prisma.patient.findMany({
            include: { admissions: true }
        });
        console.log(`Total Patients: ${patients.length}`);

        const admitted = patients.filter(p => p.admissions.some(a => !a.dischargedAt));
        console.log(`Admitted Patients (JS Filter): ${admitted.length}`);

        console.log("All Patients:");
        patients.forEach(p => {
            console.log(`- ${p.firstName} ${p.lastName} (MRN: ${p.mrn})`);
        });

        admitted.forEach(p => {
            console.log(`- ${p.firstName} ${p.lastName} (MRN: ${p.mrn})`);
        });

        const queryAdmitted = await prisma.patient.findMany({
            where: {
                admissions: {
                    some: {
                        dischargedAt: null
                    }
                }
            }
        });
        console.log(`Admitted Patients (Prisma Query): ${queryAdmitted.length}`);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
