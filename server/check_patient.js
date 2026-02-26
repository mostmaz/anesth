const { Client } = require('pg');

async function checkPatientData() {
    console.log("Checking remote DB for patient 322637-3...");
    const client = new Client({ connectionString: 'postgresql://postgres:postgres@161.35.216.33:5432/icu_db' });

    try {
        await client.connect();

        // Find patient ID
        const pRes = await client.query(`SELECT id FROM "Patient" WHERE mrn = '322637-3'`);
        if (pRes.rowCount === 0) {
            console.log("Patient 322637-3 not found!");
            return;
        }
        const patientId = pRes.rows[0].id;
        console.log(`Found Patient ID: ${patientId}`);

        // Check Vitals
        const vRes = await client.query(`SELECT count(*)::int as count FROM "VitalSign" WHERE "patientId" = $1`, [patientId]);
        console.log(`Vitals: ${vRes.rows[0].count} records`);

        // Check I/O
        const ioRes = await client.query(`SELECT count(*)::int as count FROM "IntakeOutput" WHERE "patientId" = $1`, [patientId]);
        console.log(`Intake/Output: ${ioRes.rows[0].count} records`);

        // Check MAR (Requires getting Admissions then Medications then Administrations)
        const marRes = await client.query(`
            SELECT count(*)::int as count 
            FROM "MedicationAdministration" ma
            JOIN "Medication" m ON ma."medicationId" = m.id
            JOIN "Admission" a ON m."admissionId" = a.id
            WHERE a."patientId" = $1
        `, [patientId]);
        console.log(`MAR (Administrations): ${marRes.rows[0].count} records`);

    } catch (e) {
        console.error("Error:", e.message);
    } finally {
        await client.end().catch(() => null);
    }
}

checkPatientData();
