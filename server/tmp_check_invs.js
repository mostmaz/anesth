
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        const invs = await prisma.investigation.findMany({
            where: { patientId: '8b0b885c-e27a-454c-bdc8-7ecd85bb96ad' },
            orderBy: { conductedAt: 'desc' }
        });

        console.log('--- INVESTIGATIONS FOR HASHIM (325400-3) ---');
        invs.forEach(i => {
            console.log(`[${i.externalId}] ConductedAt: ${i.conductedAt} Title: ${i.title}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}
run();
