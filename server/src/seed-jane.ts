import prisma from './prisma';

async function main() {
    try {
        const existing = await prisma.patient.findUnique({ where: { mrn: '99999' } });
        if (!existing) {
            const patient = await prisma.patient.create({
                data: {
                    mrn: '99999',
                    firstName: 'Jane',
                    lastName: 'Smith',
                    dob: new Date('1990-05-15'),
                    gender: 'Female'
                }
            });
            console.log('Created patient:', patient);
        } else {
            console.log('Patient already exists:', existing);
        }
    } catch (error) {
        console.error('Error seeding patient:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
