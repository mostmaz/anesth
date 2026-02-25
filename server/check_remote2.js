const { Client } = require('pg');

async function main() {
    const remote = new Client({ connectionString: 'postgresql://postgres:postgres@161.35.216.33:5432/icu_db' });
    await remote.connect();

    // Check the Medication table schema
    const cols = await remote.query(`
        SELECT column_name, data_type, column_default 
        FROM information_schema.columns 
        WHERE table_name = 'Medication' AND table_schema = 'public'
        ORDER BY ordinal_position
    `);
    console.log('=== Medication table columns ===');
    cols.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type} (default: ${r.column_default})`));

    // Check Patient rows
    const patients = await remote.query('SELECT id, name, "mrn" FROM "Patient"');
    console.log('\n=== Patients on remote ===');
    patients.rows.forEach(r => console.log(`  ${r.mrn}: ${r.name}`));

    // Check what DB the server container uses by looking at DATABASE_URL format
    // Let's also check if the remote server itself can reach its own DB
    const serverEnvCheck = await remote.query(`
        SELECT current_database(), inet_server_addr(), inet_server_port()
    `);
    console.log('\n=== Remote DB info ===');
    console.log('  DB:', serverEnvCheck.rows[0]);

    await remote.end();
}

main().catch(e => console.error('Error:', e.message));
