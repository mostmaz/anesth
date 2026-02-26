const { NodeSSH } = require('node-ssh');

(async () => {
    const ssh = new NodeSSH();
    await ssh.connect({ host: '161.35.216.33', username: 'root', password: '150893412C@c', readyTimeout: 30000 });

    console.log('\n--- Recreating Server Container with Env ---');
    let r = await ssh.execCommand('export GEMINI_API_KEY=AIzaSyBlfr5jvnksROJ3thAvDB2BbZJ2PGLM0Wg && docker compose up -d --force-recreate server', { cwd: '/root/anesth' });
    console.log(r.stdout || r.stderr);

    // Wait a couple seconds
    await new Promise(res => setTimeout(res, 3000));

    // Check if the env var was injected
    r = await ssh.execCommand('docker exec icu_server_prod env | grep GEMINI', { cwd: '/root/anesth' });
    console.log('\n--- Container Env ---');
    console.log(r.stdout || r.stderr || "NOT FOUND");

    ssh.dispose();
})().catch(e => { console.error(e.message); process.exit(1); });
