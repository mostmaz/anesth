/**
 * seed_io_remote.js
 * Seeds Intake/Output data for patient MRN 322637-3 on the REMOTE server.
 * Last 5 days:
 *   - INPUT: Drug Dilution — 100–150 ml/day (split across day/night shifts)
 *   - No IV Fluid
 */

const { Client } = require('pg');
const { randomUUID } = require('crypto');

const REMOTE_DB = 'postgresql://postgres:postgres@161.35.216.33:5432/icu_db';

function rand(min, max) {
    return Math.round(min + Math.random() * (max - min));
}

async function main() {
    const client = new Client({ connectionString: REMOTE_DB });
    await client.connect();
    console.log('Connected.\n');

    // Get patient
    const pRes = await client.query(`SELECT id, name FROM "Patient" WHERE mrn = $1`, ['322637-3']);
    if (!pRes.rows.length) { console.error('Patient not found!'); return; }
    const patient = pRes.rows[0];
    console.log(`Patient: ${patient.name}`);

    // Get any nurse/user to assign entries to
    const uRes = await client.query(`SELECT id, name FROM "User" LIMIT 1`);
    const user = uRes.rows[0];
    console.log(`User: ${user.name}\n`);

    // Clear existing I/O for this patient
    const del = await client.query(`DELETE FROM "IntakeOutput" WHERE "patientId" = $1`, [patient.id]);
    console.log(`Cleared ${del.rowCount} existing I/O records.\n`);

    const now = new Date('2026-02-25T16:38:00+03:00');
    const entries = [];

    for (let day = 4; day >= 0; day--) {
        const date = new Date(now);
        date.setDate(date.getDate() - day);

        // Drug Dilution spread across 2 entries per day (morning + evening)
        // Total 100–150 ml/day
        const totalDrugDilution = rand(100, 150);
        const morningDose = Math.round(totalDrugDilution * 0.55); // ~55% morning
        const eveningDose = totalDrugDilution - morningDose;       // ~45% evening

        // Morning entry (08:00)
        const morning = new Date(date);
        morning.setHours(8, 0, 0, 0);
        entries.push({
            id: randomUUID(),
            patientId: patient.id,
            userId: user.id,
            type: 'INPUT',
            category: 'Drug Dilution',
            amount: morningDose,
            notes: 'Morning medications',
            timestamp: morning.toISOString(),
        });

        // Evening entry (20:00)
        const evening = new Date(date);
        evening.setHours(20, 0, 0, 0);
        entries.push({
            id: randomUUID(),
            patientId: patient.id,
            userId: user.id,
            type: 'INPUT',
            category: 'Drug Dilution',
            amount: eveningDose,
            notes: 'Evening medications',
            timestamp: evening.toISOString(),
        });
    }

    // Insert all entries
    console.log(`Inserting ${entries.length} I/O entries...`);
    for (const e of entries) {
        await client.query(`
            INSERT INTO "IntakeOutput" (id, "patientId", "userId", type, category, amount, notes, timestamp)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [e.id, e.patientId, e.userId, e.type, e.category, e.amount, e.notes, e.timestamp]);

        const d = new Date(e.timestamp);
        console.log(`  ${d.toLocaleDateString()} ${d.toLocaleTimeString()} — ${e.type} | ${e.category}: ${e.amount} ml`);
    }

    // Summary per day
    console.log('\n--- Daily Summary ---');
    for (let day = 4; day >= 0; day--) {
        const date = new Date(now);
        date.setDate(date.getDate() - day);
        const dayEntries = entries.filter(e => new Date(e.timestamp).toDateString() === date.toDateString());
        const total = dayEntries.reduce((s, e) => s + e.amount, 0);
        console.log(`  ${date.toLocaleDateString()}: Drug Dilution = ${total} ml, IV Fluid = 0 ml`);
    }

    console.log(`\n✓ Done! Seeded ${entries.length} I/O entries for ${patient.name}.`);
    await client.end();
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
