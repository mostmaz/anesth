"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    try {
        console.log('Attempting to connect to database...');
        await prisma.$connect();
        console.log('Connection successful.');
        console.log('Checking for Patient table...');
        const count = await prisma.patient.count();
        console.log(`Found ${count} patients.`);
    }
    catch (error) {
        console.error('Database check failed:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
