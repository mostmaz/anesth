import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
    const patients = await prisma.patient.findMany({
        include: {
            admissions: true
        }
    });

    console.log(`Found ${patients.length} patients in DB.`);
    patients.forEach(p => {
        console.log(`Patient: ${p.name}, mrn: ${p.mrn}`);
        console.log(`  Admissions: ${p.admissions.length}`);
        p.admissions.forEach(a => {
            console.log(`    - Admitted at: ${a.admittedAt}, Discharged at: ${a.dischargedAt}`);
        });
    });

    await prisma.$disconnect();
}
run();
