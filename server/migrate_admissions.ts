
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrate() {
    console.log('--- Migrating Orphan Patients ---');
    try {
        // Find all patients
        const patients = await prisma.patient.findMany({
            include: { admissions: true }
        });

        let count = 0;
        for (const p of patients) {
            // Check if patient has NO admissions
            if (!p.admissions || p.admissions.length === 0) {
                console.log(`Migrating patient ${p.mrn} (${p.firstName} ${p.lastName})...`);
                await prisma.admission.create({
                    data: {
                        patientId: p.id,
                        admittedAt: new Date(), // Set admitted now
                        diagnosis: p.diagnosis || 'Admitted via Migration'
                    }
                });
                count++;
            }
        }

        console.log(`Migration Complete. Updated ${count} patients.`);
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

migrate();
