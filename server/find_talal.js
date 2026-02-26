const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
    const patients = await prisma.patient.findMany({
        where: { name: { contains: 'talal', mode: 'insensitive' } }
    });
    console.log("Found patients:", patients.map(p => ({ id: p.id, name: p.name, mrn: p.mrn })));
}

seed().finally(() => prisma.$disconnect());
