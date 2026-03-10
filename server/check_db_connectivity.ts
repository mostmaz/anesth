
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    try {
        console.log("DATABASE_URL:", process.env.DATABASE_URL);
        const count = await prisma.patient.count();
        console.log("Success! Patient count:", count);

        const admitted = await prisma.patient.findMany({
            where: { admissions: { some: { dischargedAt: null } } }
        });
        console.log("Admitted patients count:", admitted.length);
    } catch (e) {
        console.error("Database connection failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
