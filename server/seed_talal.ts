import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasourceUrl: 'postgresql://postgres:postgres@161.35.216.33:5432/icu_db'
});

async function seed() {
    const patientId = '68baae90-91be-4b76-9d3b-7e5e423a0523'; // Talal

    // Get the senior doctor user to act as the recorder
    const user = await prisma.user.findFirst({ where: { role: 'SENIOR' } });
    if (!user) throw new Error("No senior user found to author records");

    console.log(`Seeding data for Talal using user ${user.name}`);

    const now = new Date();
    // 5 days = 120 hours
    const records = [];

    // We will clear existing I/O for this patient to ensure a clean 5-day state
    await prisma.intakeOutput.deleteMany({ where: { patientId } });
    console.log("Cleared existing I/O for Talal.");

    for (let h = 120; h >= 0; h--) {
        const timestamp = new Date(now.getTime() - h * 60 * 60 * 1000);

        // Output: UOP 25-100 per hr
        const uopAmount = Math.floor(Math.random() * (100 - 25 + 1)) + 25;
        records.push({
            patientId,
            userId: user.id,
            type: 'OUTPUT',
            category: 'Urine',
            amount: uopAmount,
            notes: '',
            timestamp
        });

        // Input: Drug Dilution 100-150 cc every 8 hour
        if (h % 8 === 0) {
            const dilutionAmount = Math.floor(Math.random() * (150 - 100 + 1)) + 100;
            records.push({
                patientId,
                userId: user.id,
                type: 'INPUT',
                category: 'IV Fluid',
                amount: dilutionAmount,
                notes: 'Drug dilution',
                timestamp
            });
        }
    }

    console.log(`Inserting ${records.length} records...`);

    // Batch insert
    await prisma.intakeOutput.createMany({
        data: records
    });

    console.log("Seeding complete.");
}

seed()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
