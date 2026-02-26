const { Client } = require('pg');

async function countRows(label, connStr) {
    const client = new Client({ connectionString: connStr });
    try {
        await client.connect();
        console.log(`\n✅ Connected to ${label}`);
        const tables = ['User', 'Patient', 'Shift', 'Admission', 'Investigation', 'VitalSign', 'Medication', 'PatientAssignment'];
        for (const t of tables) {
            try {
                const r = await client.query(`SELECT COUNT(*) FROM "${t}"`);
                console.log(`  ${t}: ${r.rows[0].count} rows`);
            } catch (e) {
                console.log(`  ${t}: ERROR - ${e.message}`);
            }
        }
    } catch (e) {
        console.log(`\n❌ ${label}: ${e.message}`);
    } finally {
        await client.end().catch(() => { });
    }
}

(async () => {
    await countRows('LOCAL (localhost:5432)', 'postgresql://postgres:postgres@127.0.0.1:5432/icu_db');
    await countRows('REMOTE (161.35.216.33:5432)', 'postgresql://postgres:postgres@161.35.216.33:5432/icu_db');
})();
