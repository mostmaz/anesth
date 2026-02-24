import { PrismaClient } from '@prisma/client';

const localPrisma = new PrismaClient({
    datasources: { db: { url: "postgresql://postgres:postgres@127.0.0.1:5432/icu_db?schema=public" } }
});

const remotePrisma = new PrismaClient({
    datasources: { db: { url: "postgresql://postgres:postgres@161.35.216.33:5432/icu_db?schema=public" } }
});

async function sync() {
    console.log("Starting DB Sync...");

    // 1. Truncate all tables on remote to prevent unique constraint / FK issues
    console.log("Truncating remote tables...");
    await remotePrisma.$executeRawUnsafe(`
        TRUNCATE TABLE "User", "Governorate", "Patient", "Specialty", "DrugCatalog", 
        "Doctor", "Shift", "Admission", "ClinicalNote", "AuditLog", "VitalSign", 
        "Medication", "MedicationAdministration", "ClinicalOrder", "Investigation", 
        "SpecialistNote", "IntakeOutput", "NurseCheckIn", "PatientAssignment" CASCADE;
    `);

    // 2. Define models in FORWARD dependency order
    const models = [
        'user',
        'governorate',
        'patient',
        'specialty',
        'drugCatalog',
        'doctor',
        'shift',
        'admission',
        'clinicalNote',
        'auditLog',
        'vitalSign',
        'medication',
        'medicationAdministration',
        'clinicalOrder',
        'investigation',
        'specialistNote',
        'intakeOutput',
        'nurseCheckIn',
        'patientAssignment'
    ];

    // 3. Copy data
    for (const model of models) {
        console.log(`Copying ${model}...`);
        const data = await (localPrisma as any)[model].findMany(); // any cast to bypass strict typing for dynamic access
        if (data.length > 0) {
            await (remotePrisma as any)[model].createMany({ data });
        }
        console.log(`Synced ${data.length} records for ${model}`);
    }

    console.log("DB Sync Complete!");
}

sync().catch(console.error).finally(async () => {
    await localPrisma.$disconnect();
    await remotePrisma.$disconnect();
});
