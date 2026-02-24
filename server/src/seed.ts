import prisma from './prisma';
import bcrypt from 'bcryptjs';

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

        const passwordHash = await bcrypt.hash('password', 10);

        // Seed Nurse User
        await prisma.user.upsert({
            where: { username: 'nurse' },
            update: { passwordHash },
            create: {
                id: 'mock-nurse-id',
                name: 'Jane Nurse',
                username: 'nurse',
                passwordHash,
                role: 'NURSE'
            }
        });
        console.log('Upserted user: Jane Nurse');

        // Seed Senior User
        await prisma.user.upsert({
            where: { username: 'senior' },
            update: { passwordHash },
            create: {
                id: 'mock-senior-id',
                name: 'Dr. House',
                username: 'senior',
                passwordHash,
                role: 'SENIOR'
            }
        });
        console.log('Upserted user: Dr. House');

    } catch (error) {
        console.error('Error seeding database:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
