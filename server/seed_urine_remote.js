const { Client } = require('pg');
const { randomUUID } = require('crypto');
const REMOTE_DB = 'postgresql://postgres:postgres@161.35.216.33:5432/icu_db';
function rand(min, max) { return Math.round(min + Math.random() * (max - min)); }

async function main() {
    const client = new Client({ connectionString: REMOTE_DB });
    await client.connect();

    const pRes = await client.query(`SELECT id, name FROM "Patient" WHERE mrn = $1`, ['322637-3']);
    const patient = pRes.rows[0];
    const uRes = await client.query(`SELECT id FROM "User" LIMIT 1`);
    const userId = uRes.rows[0].id;
    console.log(`Patient: ${patient.name}\n`);

    const now = new Date('2026-02-25T16:40:00+03:00');
    const entries = [];

    // Every 6 hours for 5 days = 20 entries
    for (let day = 4; day >= 0; day--) {
        for (let hour of [6, 12, 18, 0]) {
            const ts = new Date(now);
            ts.setDate(ts.getDate() - day);
            ts.setHours(hour, 0, 0, 0);

            const rate = rand(25, 100); // ml/hr
            const amount = rate * 6;    // 6-hour measurement

            entries.push({
                id: randomUUID(),
                patientId: patient.id,
                userId,
                type: 'OUTPUT',
                category: 'Urine',
                amount,
                notes: `${rate} ml/hr`,
                timestamp: ts.toISOString(),
            });
        }
    }

    console.log(`Inserting ${entries.length} urine output entries...`);
    for (const e of entries) {
        await client.query(
            `INSERT INTO "IntakeOutput" (id, "patientId", "userId", type, category, amount, notes, timestamp)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [e.id, e.patientId, e.userId, e.type, e.category, e.amount, e.notes, e.timestamp]
        );
        const d = new Date(e.timestamp);
        console.log(`  ${d.toLocaleDateString()} ${String(d.getHours()).padStart(2, '0')}:00 — Urine: ${e.amount} ml (${e.notes})`);
    }

    console.log(`\n✓ Done! ${entries.length} urine output entries seeded.`);
    await client.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
