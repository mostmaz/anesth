const { NodeSSH } = require('node-ssh');

(async () => {
    const ssh = new NodeSSH();
    await ssh.connect({ host: '161.35.216.33', username: 'root', password: '150893412C@c', readyTimeout: 30000 });

    console.log('--- Resetting Postgres Password ---');
    let r = await ssh.execCommand(`docker exec icu_postgres_prod psql -U postgres -c "ALTER USER postgres WITH PASSWORD 'postgres';"`);
    console.log(r.stdout || r.stderr);

    console.log('\n--- Testing connection from node over TCP ---');
    r = await ssh.execCommand(
        `docker exec icu_server_prod node -e "const {Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL});c.connect().then(()=>c.query('SELECT 1')).then(()=>console.log('SUCCESS')).catch(e=>console.error('FAIL:', e.message)).finally(()=>c.end())"`
    );
    console.log(r.stdout || r.stderr);

    console.log('\n--- Restarting Server ---');
    r = await ssh.execCommand('docker restart icu_server_prod');
    console.log('Restarted.', r.stdout);

    ssh.dispose();
})().catch(e => { console.error(e.message); process.exit(1); });
