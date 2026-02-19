
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Adding 'PROCEDURE' to OrderType enum...");
        await prisma.$executeRawUnsafe(`ALTER TYPE "OrderType" ADD VALUE 'PROCEDURE'`);
        console.log("Successfully added 'PROCEDURE' to OrderType.");
    } catch (error) {
        if (String(error).includes("already exists")) {
            console.log("'PROCEDURE' already exists in OrderType.");
        } else {
            console.error("Error updating enum:", error);
        }
    } finally {
        await prisma.$disconnect();
    }
}

main();
