/**
 * fast_sync.ts
 *
 * Syncs the local PostgreSQL database to the remote server FAST.
 *
 * Strategy: Use the `pg` library to:
 *   1. Read all data from local DB using SELECT *
 *   2. Truncate remote tables (disable FK checks first)
 *   3. Insert data into remote using batched multi-row INSERTs
 *      (500 rows per INSERT statement = minimal network round-trips)
 *
 * This is ~10-50x faster than the old Prisma script because:
 *   - Batched INSERTs send hundreds of rows per query instead of one at a time
 *   - Parameterized queries handle all types (arrays, JSON, booleans, dates)
 *   - Direct pg connection without ORM overhead
 *
 * Usage:  npx ts-node fast_sync.ts
 */

import { Client, QueryConfig } from 'pg';

const LOCAL_DB = 'postgresql://postgres:postgres@127.0.0.1:5432/icu_db';
const REMOTE_DB = 'postgresql://postgres:postgres@161.35.216.33:5432/icu_db';

const BATCH_SIZE = 200; // rows per INSERT statement

// Tables in dependency order (parents before children)
const TABLES = [
    'User',
    'Governorate',
    'Patient',
    'Specialty',
    'DrugCatalog',
    'Doctor',
    'Shift',
    'Admission',
    'ClinicalNote',
    'AuditLog',
    'VitalSign',
    'Medication',
    'MedicationAdministration',
    'ClinicalOrder',
    'Investigation',
    'SpecialistNote',
    'IntakeOutput',
    'NurseCheckIn',
    'PatientAssignment',
];

async function batchInsert(
    client: Client,
    table: string,
    columns: string[],
    rows: any[]
): Promise<void> {
    if (rows.length === 0) return;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const numCols = columns.length;

        // Build: ($1, $2, $3), ($4, $5, $6), ...
        const valuePlaceholders = batch.map((_, rowIdx) => {
            const params = columns.map((_, colIdx) => `$${rowIdx * numCols + colIdx + 1}`);
            return `(${params.join(', ')})`;
        }).join(', ');

        const colList = columns.map(c => `"${c}"`).join(', ');
        const sql = `INSERT INTO "${table}" (${colList}) VALUES ${valuePlaceholders}`;

        // Flatten all values into a single array
        const values: any[] = [];
        for (const row of batch) {
            for (const col of columns) {
                let val = row[col];
                // Convert JS objects/arrays to JSON string if needed
                // pg will handle arrays natively, and JSON columns need stringification
                if (val !== null && val !== undefined && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
                    val = JSON.stringify(val);
                }
                values.push(val);
            }
        }

        await client.query(sql, values);
    }
}

async function main() {
    console.log('=== Fast DB Sync ===\n');
    const t0 = Date.now();

    const local = new Client({ connectionString: LOCAL_DB });
    const remote = new Client({ connectionString: REMOTE_DB });

    console.log('Connecting to databases...');
    await local.connect();
    await remote.connect();
    console.log('  Connected.\n');

    // 1. Read all local data
    console.log('[1/3] Reading local data...');
    const tableData: Record<string, { columns: string[]; rows: any[] }> = {};
    let totalRows = 0;

    for (const table of TABLES) {
        const result = await local.query(`SELECT * FROM "${table}"`);
        tableData[table] = {
            columns: result.fields.map(f => f.name),
            rows: result.rows,
        };
        console.log(`  ${table}: ${result.rows.length} rows`);
        totalRows += result.rows.length;
    }
    console.log(`  Total: ${totalRows} rows.\n`);
    await local.end();

    // 2. Truncate remote tables
    console.log('[2/3] Truncating remote tables...');
    await remote.query('SET session_replication_role = replica');
    const tableList = TABLES.map(t => `"${t}"`).join(', ');
    await remote.query(`TRUNCATE TABLE ${tableList} CASCADE`);
    console.log('  Done.\n');

    // 3. Insert all data in batches
    console.log('[3/3] Inserting data to remote...');

    for (const table of TABLES) {
        const { columns, rows } = tableData[table];
        if (rows.length === 0) {
            console.log(`  ${table}: skipped (empty)`);
            continue;
        }
        await batchInsert(remote, table, columns, rows);
        console.log(`  ${table}: ${rows.length} rows inserted`);
    }

    await remote.query('SET session_replication_role = DEFAULT');

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`\n=== Sync Complete in ${elapsed}s! ===`);

    await remote.end();
}

main().catch(err => {
    console.error('\nSync failed:', err.message || err);
    process.exit(1);
});
