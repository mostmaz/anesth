const { Client } = require('pg');

async function listPatients() {
    console.log("Fetching all patients from remote DB...");
    const client = new Client({ connectionString: 'postgresql://postgres:postgres@161.35.216.33:5432/icu_db' });

    try {
        await client.connect();
        const res = await client.query(`SELECT id, name, mrn FROM "Patient"`);
        console.log("Patients:");
        console.table(res.rows);
    } catch (e) {
        console.error("Error:", e.message);
    } finally {
        await client.end().catch(() => null);
    }
}

listPatients();
