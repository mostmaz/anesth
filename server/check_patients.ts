
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Checking Patients...");
        const count = await prisma.patient.count();
        console.log(`Total Patients: ${count}`);

        const patients = await prisma.patient.findMany({ take: 5, include: { admissions: true } });
        console.log("First 5 patients:", JSON.stringify(patients, null, 2));
    } catch (error) {
        console.error("Error fetching patients:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
