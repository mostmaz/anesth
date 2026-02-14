
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.post('/mrn-139494', async (req, res) => {
    console.log("Starting MRN 139494 data seed (3 Days) via API...");

    try {
        // 1. Get or Create Patient (MRN 139494)
        let patient = await prisma.patient.findUnique({ where: { mrn: '139494' } });
        if (!patient) {
            patient = await prisma.patient.create({
                data: {
                    mrn: '139494',
                    firstName: 'Test',
                    lastName: 'Patient-139494',
                    dob: new Date('1975-05-15'),
                    gender: 'Male',
                    diagnosis: 'Post-Op Observation',
                    admissions: {
                        create: {
                            bed: 'ICU-10',
                            diagnosis: 'Post-Op',
                            admittedAt: new Date(Date.now() - 96 * 60 * 60 * 1000) // Admitted 4 days ago
                        }
                    }
                }
            });
            console.log('Created patient: 139494');
        } else {
            console.log('Using existing patient: 139494');
        }

        // 2. Get or Create Nurse User
        let nurse = await prisma.user.findFirst({ where: { role: 'NURSE' } });
        if (!nurse) {
            nurse = await prisma.user.create({
                data: {
                    name: 'Seed Nurse',
                    username: 'seed_nurse',
                    passwordHash: 'mock-hash',
                    role: 'NURSE'
                }
            });
        }

        const patientId = patient.id;
        const userId = nurse.id;
        const now = new Date();
        const threeDaysAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);

        // --- VITALS (Every 1 hour for 72 hours) ---
        console.log("Seeding Vitals...");
        const vitalEntries = [];
        for (let i = 0; i < 72; i++) {
            const time = new Date(threeDaysAgo.getTime() + i * 60 * 60 * 1000);

            // Simulate diurnal variation
            const isNight = time.getHours() >= 22 || time.getHours() < 6;

            const hrBase = isNight ? 70 : 85;
            const hr = hrBase + Math.floor(Math.random() * 15);

            const bpSys = 120 + Math.floor(Math.random() * 20);
            const bpDia = 70 + Math.floor(Math.random() * 10);
            const spo2 = 96 + Math.floor(Math.random() * 4);
            const temp = 36.6 + (Math.random() * 0.8);

            // RBS every 6 hours
            const rbs = i % 6 === 0 ? (90 + Math.floor(Math.random() * 40)) : undefined;

            vitalEntries.push({
                patientId,
                heartRate: hr,
                bpSys,
                bpDia,
                spo2,
                temp: parseFloat(temp.toFixed(1)),
                rbs: rbs ? parseFloat(rbs.toFixed(1)) : undefined,
                timestamp: time
            });
        }
        await prisma.vitalSign.createMany({ data: vitalEntries });


        // --- IO (Every 4 hours for 72 hours) ---
        console.log("Seeding Intake/Output...");
        const ioEntries = [];
        for (let i = 0; i < 18; i++) { // 72h / 4h = 18 entries
            const time = new Date(threeDaysAgo.getTime() + i * 4 * 60 * 60 * 1000);

            // Input: Normal Saline
            ioEntries.push({
                patientId,
                userId,
                type: 'INPUT',
                category: 'Normal Saline',
                amount: 100.0 * 4, // 100ml/hr * 4hrs
                timestamp: time
            });

            // Output: Urine
            ioEntries.push({
                patientId,
                userId,
                type: 'OUTPUT',
                category: 'Urine',
                amount: 100 + Math.floor(Math.random() * 400), // Random urine
                timestamp: time
            });
        }
        await prisma.intakeOutput.createMany({ data: ioEntries });

        console.log("Seeding for MRN 139494 completed!");
        res.json({ success: true, message: "Seeded MRN 139494" });

    } catch (error: any) {
        console.error("Error seeding data:", error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
