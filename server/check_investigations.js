
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const patient = await prisma.patient.findUnique({
        where: { mrn: '139494' },
        include: { investigations: true }
    });

    if (patient) {
        console.log(`Patient: ${patient.firstName} ${patient.lastName}`);
        console.log(`Investigations: ${patient.investigations.length}`);
        patient.investigations.forEach(i => {
            console.log(`- ${i.title} (ExtID: ${i.externalId})`);
        });
    } else {
        console.log("Patient not found");
    }
    await prisma.$disconnect();
}

run();
