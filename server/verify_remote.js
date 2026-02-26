const { NodeSSH } = require('node-ssh');

(async () => {
    const ssh = new NodeSSH();
    await ssh.connect({ host: '161.35.216.33', username: 'root', password: '150893412C@c', readyTimeout: 30000 });

    // Check if docker-compose.yml has the GEMINI key
    let r = await ssh.execCommand('cat docker-compose.yml | grep GEMINI', { cwd: '/root/anesth' });
    console.log('\n--- Remote docker-compose.yml config ---');
    console.log(r.stdout || r.stderr || "NOT FOUND IN COMPOSE FILE");

    // Print node environment inside the container
    r = await ssh.execCommand('docker exec icu_server_prod node -e "console.log(process.env.GEMINI_API_KEY || \'NO_KEY_FOUND\')"', { cwd: '/root/anesth' });
    console.log('\n--- Node server ENV ---');
    console.log(r.stdout || r.stderr);

    ssh.dispose();
})().catch(e => { console.error(e.message); process.exit(1); });
