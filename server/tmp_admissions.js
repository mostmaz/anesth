
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        const patients = await prisma.patient.findMany({
            where: { name: { contains: 'هاشم' } },
            include: {
                admissions: {
                    where: { dischargedAt: null }
                }
            }
        });

        console.log('--- HASHIM PATIENTS AND ACTIVE ADMISSIONS ---');
        patients.forEach(p => {
            console.log(`Patient ID: ${p.id}`);
            console.log(`Name: ${p.name}`);
            console.log(`MRN: ${p.mrn}`);
            console.log(`Active Admissions: ${p.admissions.length}`);
            p.admissions.forEach(a => {
                console.log(`  - Admission ID: ${a.id} (Admitted At: ${a.admittedAt})`);
            });
            console.log('-------------------');
        });
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}
run();
