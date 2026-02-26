import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasourceUrl: 'postgresql://postgres:postgres@161.35.216.33:5432/icu_db'
});

async function debugData() {
    const patient = await prisma.patient.findFirst({
        where: { mrn: '322637-3' },
        include: {
            vitals: true,
            medications: true,
        }
    });

    console.log("Patient 322637-3 Data:");
    console.log("- Vitals count:", patient?.vitals.length);
    console.log("- Vitals details:", JSON.stringify(patient?.vitals, null, 2));
    console.log("- Medications count:", patient?.medications.length);

    // Are there active shifting issues?
    const shifts = await prisma.shift.findMany();
    console.log("- Active shifts globally:", shifts.length);
}
debugData().finally(() => prisma.$disconnect());
