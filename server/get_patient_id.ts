
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const patient = await prisma.patient.findUnique({
        where: { mrn: '139494' }
    });
    if (patient) {
        console.log(`PATIENT_ID:${patient.id}`);
    } else {
        console.log('PATIENT_NOT_FOUND');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
