const { NodeSSH } = require('node-ssh');

(async () => {
    const ssh = new NodeSSH();
    await ssh.connect({ host: '161.35.216.33', username: 'root', password: '150893412C@c', readyTimeout: 30000 });

    // 1. Update docker-compose.yml to bind to 127.0.0.1 only
    console.log('--- Securing docker-compose.yml ---');
    await ssh.execCommand('sed -i \'s/- \\"5432:5432\\"/- \\"127.0.0.1:5432:5432\\"/g\' docker-compose.yml', { cwd: '/root/anesth' });

    // 2. Restart docker compose
    console.log('--- Restarting Docker Compose ---');
    let r = await ssh.execCommand('docker compose up -d', { cwd: '/root/anesth' });
    console.log(r.stdout || r.stderr);

    // 3. Reset Postgres password back to 'postgres' internally
    console.log('\n--- Resetting Postgres Password ---');
    r = await ssh.execCommand(`docker exec icu_postgres_prod psql -U postgres -c "ALTER USER postgres WITH PASSWORD 'postgres';"`);
    console.log(r.stdout || r.stderr);

    // 4. Restart Server
    console.log('\n--- Restarting Server ---');
    r = await ssh.execCommand('docker restart icu_server_prod');
    console.log('Restarted.', r.stdout);

    ssh.dispose();
})().catch(e => { console.error(e.message); process.exit(1); });
