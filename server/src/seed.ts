import prisma from './prisma';

async function main() {
    try {
        // Seed Patient
        const existingPatient = await prisma.patient.findUnique({ where: { mrn: '12345' } });
        if (!existingPatient) {
            await prisma.patient.create({
                data: {
                    mrn: '12345',
                    name: 'John Doe',
                    dob: new Date('1980-01-01'),
                    gender: 'Male'
                }
            });
            console.log('Created patient: John Doe');
        }

        // Seed Nurse User
        const existingUser = await prisma.user.findUnique({ where: { username: 'nurse' } });
        if (!existingUser) {
            await prisma.user.create({
                data: {
                    id: 'mock-nurse-id', // Force ID to match frontend mock
                    name: 'Jane Nurse',
                    username: 'nurse',
                    passwordHash: 'hashed-password', // Mock hash
                    role: 'NURSE'
                }
            });
            console.log('Created user: Jane Nurse (mock-nurse-id)');
        }

        // Seed Senior User
        const existingSenior = await prisma.user.findUnique({ where: { username: 'senior' } });
        if (!existingSenior) {
            await prisma.user.create({
                data: {
                    id: 'mock-senior-id',
                    name: 'Dr. House',
                    username: 'senior',
                    passwordHash: 'hashed-password',
                    role: 'SENIOR'
                }
            });
            console.log('Created user: Dr. House (mock-senior-id)');
        }

    } catch (error) {
        console.error('Error seeding database:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
