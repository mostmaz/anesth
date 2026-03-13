const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.investigation.findMany({
    where: { patientId: 'c545e12f-9e2d-485c-90f4-43a2b7203391' },
    select: { title: true, conductedAt: true, externalId: true, status: true, createdAt: true },
    orderBy: { createdAt: 'desc' }
}).then(r => {
    console.log(`Found ${r.length} investigations for علي:`);
    r.forEach(inv => console.log(`- ${inv.title} | ${inv.status} | date: ${inv.conductedAt} | extId: ${inv.externalId} | created: ${inv.createdAt}`));
}).catch(e => console.error('Error:', e.message))
.finally(() => p.$disconnect());
