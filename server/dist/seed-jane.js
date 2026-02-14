"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("./prisma"));
async function main() {
    try {
        const existing = await prisma_1.default.patient.findUnique({ where: { mrn: '99999' } });
        if (!existing) {
            const patient = await prisma_1.default.patient.create({
                data: {
                    mrn: '99999',
                    firstName: 'Jane',
                    lastName: 'Smith',
                    dob: new Date('1990-05-15'),
                    gender: 'Female'
                }
            });
            console.log('Created patient:', patient);
        }
        else {
            console.log('Patient already exists:', existing);
        }
    }
    catch (error) {
        console.error('Error seeding patient:', error);
    }
    finally {
        await prisma_1.default.$disconnect();
    }
}
main();
