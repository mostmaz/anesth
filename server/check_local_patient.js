const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function extractPatientData() {
    const local = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:5432/icu_db' });
    const remote = new Client({ connectionString: 'postgresql://postgres:postgres@161.35.216.33:5432/icu_db' });

    try {
        await local.connect();
        await remote.connect();

        console.log("Fetching local patient data for 322637-3...");
        const pRes = await local.query(`SELECT id FROM "Patient" WHERE mrn = '322637-3'`);
        if (pRes.rowCount === 0) return console.log("Patient not found locally either.");

        const pId = pRes.rows[0].id;

        // 1. Vitals
        const vitals = await local.query(`SELECT * FROM "VitalSign" WHERE "patientId" = $1`, [pId]);
        console.log(`Local Vitals: ${vitals.rowCount}`);

        // 2. I/O
        const io = await local.query(`SELECT * FROM "IntakeOutput" WHERE "patientId" = $1`, [pId]);
        console.log(`Local I/O: ${io.rowCount}`);

        // 3. Admissions -> Medications
        const admissions = await local.query(`SELECT id FROM "Admission" WHERE "patientId" = $1`, [pId]);
        let medsCount = 0;
        let adminCount = 0;

        for (const adm of admissions.rows) {
            const meds = await local.query(`SELECT id FROM "Medication" WHERE "patientId" = $1`, [pId]);
            medsCount += meds.rowCount;

            for (const m of meds.rows) {
                const admins = await local.query(`SELECT id FROM "MedicationAdministration" WHERE "medicationId" = $1`, [m.id]);
                adminCount += admins.rowCount;
            }
        }
        console.log(`Local Medications: ${medsCount}, Administrations: ${adminCount}`);

    } catch (e) {
        console.error("Error:", e.message);
    } finally {
        await local.end().catch(() => null);
        await remote.end().catch(() => null);
    }
}

extractPatientData();
