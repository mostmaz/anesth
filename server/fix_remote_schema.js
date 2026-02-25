/**
 * fix_remote_schema.js
 * 
 * Applies schema changes to the remote DB that were added locally via Prisma but
 * never pushed to the remote server.
 * 
 * Changes applied:
 *   1. Add `isActive` column to Medication table (added in MAR enhancements session)
 * 
 * After running this, restart the remote server container so it picks up the schema.
 */

const { Client } = require('pg');

const REMOTE_DB = 'postgresql://postgres:postgres@161.35.216.33:5432/icu_db';

async function main() {
    console.log('Connecting to remote DB...');
    const client = new Client({ connectionString: REMOTE_DB });
    await client.connect();
    console.log('Connected.\n');

    // Check current columns on Medication
    const existingCols = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Medication' AND table_schema = 'public'
    `);
    const colNames = existingCols.rows.map(r => r.column_name);
    console.log('Current Medication columns:', colNames.join(', '));

    // Add isActive if missing
    if (!colNames.includes('isActive')) {
        console.log('\nAdding isActive column to Medication...');
        await client.query(`
            ALTER TABLE "Medication" 
            ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true
        `);
        console.log('  Done!');
    } else {
        console.log('  isActive column already exists, skipping.');
    }

    // Check all other tables/columns that might be new
    // Check VitalSign.rbs
    const vsResult = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'VitalSign' AND table_schema = 'public'
    `);
    const vsCols = vsResult.rows.map(r => r.column_name);
    console.log('\nVitalSign columns:', vsCols.join(', '));

    if (!vsCols.includes('rbs')) {
        console.log('Adding rbs column to VitalSign...');
        await client.query(`ALTER TABLE "VitalSign" ADD COLUMN "rbs" DOUBLE PRECISION`);
        console.log('  Done!');
    }

    // Check PatientAssignment table exists
    const paResult = await client.query(`
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_name = 'PatientAssignment' AND table_schema = 'public'
    `);
    if (paResult.rows[0].count === '0') {
        console.log('\nWARNING: PatientAssignment table does not exist on remote!');
    } else {
        console.log('\nPatientAssignment table: OK');
    }

    // Final check - verify Patient count
    const patientCount = await client.query('SELECT COUNT(*) as n FROM "Patient"');
    console.log(`\nPatient count on remote: ${patientCount.rows[0].n}`);

    await client.end();
    console.log('\nSchema update complete!');
    console.log('\nNEXT STEP: Restart the remote server container:');
    console.log('  node restart_prod.js');
    console.log('  OR run: node push_schema_and_restart.js');
}

main().catch(e => {
    console.error('Failed:', e.message);
    process.exit(1);
});
