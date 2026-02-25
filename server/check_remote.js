const { Client } = require('pg');

async function check(label, url) {
    const c = new Client({ connectionString: url });
    try {
        await c.connect();
        const tables = await c.query(
            "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
        );
        console.log(`\n=== ${label} ===`);
        if (tables.rows.length === 0) {
            console.log('  NO TABLES FOUND');
            return;
        }
        for (const { table_name } of tables.rows) {
            try {
                const cnt = await c.query(`SELECT COUNT(*) as n FROM "${table_name}"`);
                console.log(`  ${table_name}: ${cnt.rows[0].n} rows`);
            } catch (e) {
                console.log(`  ${table_name}: ERROR - ${e.message}`);
            }
        }
    } catch (e) {
        console.log(`\n=== ${label} ===`);
        console.log('  Connection failed:', e.message);
    } finally {
        await c.end().catch(() => { });
    }
}

async function main() {
    // Check the direct port 5432 connection (what our script uses)
    await check('Remote port 5432 - icu_db', 'postgresql://postgres:postgres@161.35.216.33:5432/icu_db');

    // Also check if there are other DBs
    const c = new Client({ connectionString: 'postgresql://postgres:postgres@161.35.216.33:5432/postgres' });
    try {
        await c.connect();
        const dbs = await c.query("SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname");
        console.log('\n=== Databases on remote server ===');
        dbs.rows.forEach(r => console.log(' -', r.datname));
        await c.end();
    } catch (e) {
        console.log('\nCould not list databases:', e.message);
    }
}

main();
