const { Client } = require('pg');

(async () => {
    const client = new Client({ connectionString: 'postgresql://postgres:postgres@161.35.216.33:5432/icu_db' });
    await client.connect();
    const users = await client.query(`SELECT username, name, role FROM "User" ORDER BY role`);
    console.log('\n=== USERS IN REMOTE DB ===');
    users.rows.forEach(u => console.log(`  ${u.role.padEnd(10)} | ${u.username.padEnd(20)} | ${u.name}`));
    await client.end();
})().catch(e => console.error(e.message));
