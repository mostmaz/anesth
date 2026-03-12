
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        const invs = await prisma.investigation.findMany({
            where: { externalId: '2260311100' },
            include: { patient: true }
        });

        console.log('--- GLOBAL SEARCH FOR ACC: 2260311100 ---');
        invs.forEach(i => {
            console.log(`Investigation ID: ${i.id}`);
            console.log(`Patient ID: ${i.patientId}`);
            console.log(`Patient Name: ${i.patient.name}`);
            console.log(`Patient MRN: ${i.patient.mrn}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}
run();
