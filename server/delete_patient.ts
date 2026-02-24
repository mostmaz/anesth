import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const patient = await prisma.patient.delete({
            where: { mrn: '322637-3' },
        });
        console.log('Successfully deleted patient:', patient);
    } catch (error) {
        console.error('Error deleting patient:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
