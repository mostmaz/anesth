const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.findMany({ select: { id: true, name: true } })
    .then(u => console.log(JSON.stringify(u, null, 2)))
    .catch(e => console.error('Error:', e.message))
    .finally(() => p.$disconnect());
