const { Client } = require('pg');
const REMOTE_DB = 'postgresql://postgres:postgres@161.35.216.33:5432/icu_db';

async function main() {
    const client = new Client({ connectionString: REMOTE_DB });
    await client.connect();
    console.log('Connected.');
    await client.query(`ALTER TABLE "PatientAssignment" ADD COLUMN IF NOT EXISTS "isPending" BOOLEAN NOT NULL DEFAULT false`);
    console.log('isPending column added.');
    await client.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
