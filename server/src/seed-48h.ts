import prisma from './prisma';

async function main() {
    console.log("Starting 48h data seed...");

    try {
        // 1. Get or Create Patient (John Doe)
        let patient = await prisma.patient.findUnique({ where: { mrn: '12345' } });
        if (!patient) {
            patient = await prisma.patient.create({
                data: {
                    mrn: '12345',
                    firstName: 'John',
                    lastName: 'Doe',
                    dob: new Date('1980-01-01'),
                    gender: 'Male',
                    diagnosis: 'Sepsis',
                    admissions: {
                        create: {
                            bed: 'ICU-01',
                            diagnosis: 'Sepsis',
                            admittedAt: new Date(Date.now() - 72 * 60 * 60 * 1000) // Admitted 3 days ago
                        }
                    }
                }
            });
            console.log('Created patient: John Doe');
        } else {
            console.log('Using existing patient: John Doe');
        }

        // 2. Get or Create Nurse User
        let nurse = await prisma.user.findUnique({ where: { username: 'nurse' } });
        if (!nurse) {
            nurse = await prisma.user.create({
                data: {
                    name: 'Jane Nurse',
                    username: 'nurse',
                    passwordHash: 'mock-hash',
                    role: 'NURSE'
                }
            });
            console.log('Created nurse: Jane Nurse');
        }

        const patientId = patient.id;
        const userId = nurse.id;

        // 3. Clear existing recent data for cleanliness (optional, but good for "filling" request)
        // Check if we want to delete... maybe strict append is safer?
        // Let's just append. Data density is fine.

        const now = new Date();
        const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

        // --- VITALS (Every 1 hour) ---
        console.log("Seeding Vitals...");
        const vitalEntries = [];
        for (let i = 0; i < 48; i++) {
            const time = new Date(fortyEightHoursAgo.getTime() + i * 60 * 60 * 1000);

            // Randomize slightly
            const hr = 60 + Math.floor(Math.random() * 40); // 60-100
            const bpSys = 110 + Math.floor(Math.random() * 30); // 110-140
            const bpDia = 60 + Math.floor(Math.random() * 20); // 60-80
            const spo2 = 94 + Math.floor(Math.random() * 6); // 94-100
            const temp = 36.5 + (Math.random() * 1.5); // 36.5 - 38.0
            const rbs = i % 4 === 0 ? (80 + Math.floor(Math.random() * 60)) : undefined; // RBS every 4 hours

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


        // --- IO (Every 4 hours) ---
        console.log("Seeding Intake/Output...");
        const ioEntries = [];
        for (let i = 0; i < 12; i++) { // 48h / 4h = 12 entries
            const time = new Date(fortyEightHoursAgo.getTime() + i * 4 * 60 * 60 * 1000);

            // Input: IV Fluids
            ioEntries.push({
                patientId,
                userId,
                type: 'INPUT',
                category: 'IV Fluid',
                amount: 125.0 * 4, // 125ml/hr * 4hrs
                timestamp: time
            });

            // Output: Urine
            ioEntries.push({
                patientId,
                userId,
                type: 'OUTPUT',
                category: 'Urine',
                amount: 150 + Math.floor(Math.random() * 300), // Random urine
                timestamp: time
            });
        }
        await prisma.intakeOutput.createMany({ data: ioEntries });


        // --- MAR (Prescribe & Administer) ---
        console.log("Seeding Medications...");

        // 1. Paracetamol 1g Q6H PO
        let paracetamol = await prisma.medication.create({
            data: {
                patientId,
                name: 'Paracetamol',
                defaultDose: '1g',
                route: 'PO',
                frequency: 'Q6H'
            }
        });

        // 2. Ceftriaxone 2g OD IV
        let ceftriaxone = await prisma.medication.create({
            data: {
                patientId,
                name: 'Ceftriaxone',
                defaultDose: '2g',
                route: 'IV',
                frequency: 'OD'
            }
        });

        // 3. Furosemide 40mg BD IV
        let furosemide = await prisma.medication.create({
            data: {
                patientId,
                name: 'Furosemide',
                defaultDose: '40mg',
                route: 'IV',
                frequency: 'BD'
            }
        });

        // Administer Loop
        const marEntries = [];
        // Paracetamol Q6H (8 doses in 48h)
        for (let i = 0; i < 8; i++) {
            const time = new Date(fortyEightHoursAgo.getTime() + i * 6 * 60 * 60 * 1000); // 0, 6, 12...
            marEntries.push({
                patientId,
                medicationId: paracetamol.id,
                status: 'Given',
                dose: '1g',
                userId,
                timestamp: time
            });
        }
        // Ceftriaxone OD (2 doses)
        for (let i = 0; i < 2; i++) {
            const time = new Date(fortyEightHoursAgo.getTime() + i * 24 * 60 * 60 * 1000 + 3600000); // Offset 1h
            marEntries.push({
                patientId,
                medicationId: ceftriaxone.id,
                status: 'Given',
                dose: '2g',
                userId,
                timestamp: time
            });
        }
        // Furosemide BD (4 doses)
        for (let i = 0; i < 4; i++) {
            const time = new Date(fortyEightHoursAgo.getTime() + i * 12 * 60 * 60 * 1000 + 7200000); // Offset 2h
            marEntries.push({
                patientId,
                medicationId: furosemide.id,
                status: 'Given',
                dose: '40mg',
                userId,
                timestamp: time
            });
        }

        await prisma.medicationAdministration.createMany({ data: marEntries });


        // --- INVESTIGATIONS (One every 24h) ---
        console.log("Seeding Investigations...");
        const labs = [];
        // Lab 1: -40h
        labs.push({
            patientId,
            authorId: userId,
            type: 'LAB',
            category: 'Hematology',
            title: 'CBC',
            status: 'FINAL',
            result: { "Hb": 11.2, "WBC": 13.5, "Plt": 150 },
            impression: 'Leukocytosis observed.',
            conductedAt: new Date(now.getTime() - 40 * 60 * 60 * 1000),
            createdAt: new Date(now.getTime() - 39 * 60 * 60 * 1000) // Entered 1h later
        });
        // Lab 2: -16h
        labs.push({
            patientId,
            authorId: userId,
            type: 'LAB',
            category: 'Biochemistry',
            title: 'Renal Profile',
            status: 'FINAL',
            result: { "Cr": 1.1, "Urea": 45, "Na": 138, "K": 4.1 },
            impression: 'Normal renal function.',
            conductedAt: new Date(now.getTime() - 16 * 60 * 60 * 1000),
            createdAt: new Date(now.getTime() - 15 * 60 * 60 * 1000)
        });

        for (const lab of labs) {
            // prisma.investigation.createMany doesn't support relation fields usually? 
            // Actually it does if foreign keys match. But `data` usually expects `create` type.
            // createMany is strictly shape-based.
            // Enums need care.
            await prisma.investigation.create({
                data: {
                    ...lab,
                    type: lab.type as any,
                    status: lab.status as any
                }
            });
        }


        // --- NOTES / HANDOVERS (Every 12h) ---
        console.log("Seeding Notes...");
        const notes = [];
        for (let i = 0; i < 4; i++) {
            const time = new Date(fortyEightHoursAgo.getTime() + i * 12 * 60 * 60 * 1000 + 11 * 60 * 60 * 1000); // End of shift roughly
            notes.push({
                patientId,
                authorId: userId,
                type: 'PROGRESS',
                title: `Nursing Progress Note - Shift ${i + 1}`,
                content: `Patient hemodynamically stable. Vitals maintained. I/O balanced. Plan to continue current management.`,
                createdAt: time
            });
        }
        // Use createMany for notes
        // Note: `type` is enum.
        await prisma.clinicalNote.createMany({
            data: notes.map(n => ({ ...n, type: 'PROGRESS' as any }))
        });

        console.log("Seed completed successfully!");

    } catch (error) {
        console.error("Error seeding 48h data:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
