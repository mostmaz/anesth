import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanBadInvestigations() {
    const investigations = await prisma.investigation.findMany({
        where: {
            category: 'External',
            type: 'LAB'
        }
    });

    let deletedCount = 0;

    for (const inv of investigations) {
        if (!inv.result) continue;
        const resultsStr = JSON.stringify(inv.result);
        if (resultsStr.includes('405 Method Not Allowed') || resultsStr.includes('405')) {
            console.log(`Found bad investigation (ID: ${inv.id}, Title: ${inv.title}). Deleting...`);
            await prisma.investigation.delete({ where: { id: inv.id } });
            deletedCount++;
        }
    }

    console.log(`Deleted ${deletedCount} bad investigations.`);
}

cleanBadInvestigations()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
