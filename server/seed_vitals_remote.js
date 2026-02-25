/**
 * seed_vitals_remote.js
 * Seeds realistic vital signs for patient MRN 322637-3 on the REMOTE server
 * for the last 4 days (every 6 hours = 4 readings/day = 16 total readings).
 */

const { Client } = require('pg');
const { randomUUID } = require('crypto');

const REMOTE_DB = 'postgresql://postgres:postgres@161.35.216.33:5432/icu_db';

// Realistic ICU vital ranges
function rand(min, max) {
    return Math.round(min + Math.random() * (max - min));
}
function randFloat(min, max, dec = 1) {
    return parseFloat((min + Math.random() * (max - min)).toFixed(dec));
}

async function main() {
    const client = new Client({ connectionString: REMOTE_DB });
    await client.connect();
    console.log('Connected to remote DB.\n');

    // 1. Find patient by MRN
    const patientResult = await client.query(
        `SELECT id, name FROM "Patient" WHERE mrn = $1`,
        ['322637-3']
    );

    if (patientResult.rows.length === 0) {
        console.error('Patient with MRN 322637-3 not found on remote!');
        await client.end();
        return;
    }

    const patient = patientResult.rows[0];
    console.log(`Found patient: ${patient.name} (${patient.id})\n`);

    // 2. Generate vitals: every 6 hours for last 4 days = 16 readings
    const now = new Date('2026-02-25T16:37:00+03:00'); // current local time
    const vitals = [];

    for (let day = 3; day >= 0; day--) {
        for (let hour of [6, 12, 18, 0]) {
            const ts = new Date(now);
            ts.setDate(ts.getDate() - day);
            ts.setHours(hour, 0, 0, 0);

            vitals.push({
                id: randomUUID(),
                patientId: patient.id,
                heartRate: rand(65, 110),
                bpSys: rand(100, 150),
                bpDia: rand(60, 95),
                spo2: rand(92, 100),
                temp: randFloat(36.2, 38.8),
                rbs: randFloat(90, 220, 1),
                timestamp: ts.toISOString(),
            });
        }
    }

    // 3. Delete existing vitals for this patient (clean slate)
    const deleted = await client.query(
        `DELETE FROM "VitalSign" WHERE "patientId" = $1`,
        [patient.id]
    );
    console.log(`Cleared ${deleted.rowCount} existing vital records.\n`);

    // 4. Insert all vitals
    console.log(`Inserting ${vitals.length} vital sign readings...`);
    for (const v of vitals) {
        await client.query(`
            INSERT INTO "VitalSign" 
                (id, "patientId", "heartRate", "bpSys", "bpDia", "spo2", temp, rbs, timestamp)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [v.id, v.patientId, v.heartRate, v.bpSys, v.bpDia, v.spo2, v.temp, v.rbs, v.timestamp]);

        const d = new Date(v.timestamp);
        console.log(`  ${d.toLocaleDateString()} ${d.toLocaleTimeString()} — HR:${v.heartRate} BP:${v.bpSys}/${v.bpDia} SpO2:${v.spo2}% Temp:${v.temp}°C RBS:${v.rbs}`);
    }

    console.log(`\n✓ Done! Seeded ${vitals.length} vitals for ${patient.name}.`);
    await client.end();
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
