/**
 * alter_remote.js - Minimal: just ALTER TABLE to add missing columns
 * Avoids slow information_schema queries.
 */
const { Client } = require('pg');

const REMOTE_DB = 'postgresql://postgres:postgres@161.35.216.33:5432/icu_db';

async function main() {
    console.log('Connecting...');
    const client = new Client({ connectionString: REMOTE_DB });
    await client.connect();
    console.log('Connected.');

    // Use IF NOT EXISTS to avoid errors if column already exists
    const statements = [
        `ALTER TABLE "Medication" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true`,
        `ALTER TABLE "VitalSign" ADD COLUMN IF NOT EXISTS "rbs" DOUBLE PRECISION`,
    ];

    for (const sql of statements) {
        try {
            console.log('Running:', sql.substring(0, 80));
            await client.query(sql);
            console.log('  OK');
        } catch (e) {
            // Ignore "already exists" errors
            if (e.message.includes('already exists')) {
                console.log('  Already exists, skipped.');
            } else {
                console.error('  Error:', e.message);
            }
        }
    }

    // Quick count
    const r = await client.query('SELECT COUNT(*) as n FROM "Patient"');
    console.log('\nPatients on remote:', r.rows[0].n);

    await client.end();
    console.log('Done!');
}

main().catch(e => { console.error('Failed:', e.message); process.exit(1); });
