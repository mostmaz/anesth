const { NodeSSH } = require('node-ssh');

(async () => {
    const ssh = new NodeSSH();
    await ssh.connect({ host: '161.35.216.33', username: 'root', password: '150893412C@c', readyTimeout: 30000 });

    console.log('--- Pulling latest code ---');
    let r = await ssh.execCommand('git pull origin main', { cwd: '/root/anesth' });
    console.log(r.stdout || r.stderr);

    console.log('\n--- Rebuilding server container ---');
    r = await ssh.execCommand('docker compose up -d --build server', { cwd: '/root/anesth' });
    console.log(r.stdout || r.stderr);

    // Wait a couple seconds for it to boot
    await new Promise(res => setTimeout(res, 3000));

    console.log('\n--- Testing Login Call Locally inside Server Container ---');
    r = await ssh.execCommand(
        `docker exec icu_server_prod node -e "fetch('http://127.0.0.1:3001/api/auth/login', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'senior',password:'password'})}).then(r=>r.status).then(console.log).catch(console.error)"`
    );
    console.log('HTTP Status from internal test:', r.stdout || r.stderr);

    ssh.dispose();
})().catch(e => { console.error(e.message); process.exit(1); });
