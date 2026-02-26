const { NodeSSH } = require('node-ssh');

(async () => {
    const ssh = new NodeSSH();
    await ssh.connect({ host: '161.35.216.33', username: 'root', password: '150893412C@c', readyTimeout: 30000 });

    console.log('--- Fetching latest server logs ---');
    let r = await ssh.execCommand('docker logs icu_server_prod --tail 1000 | grep -i error', { cwd: '/root/anesth' });
    console.log("ERRORS:\n", r.stdout || r.stderr);

    r = await ssh.execCommand('docker logs icu_server_prod --tail 500', { cwd: '/root/anesth' });
    console.log("\nLATEST:\n", r.stdout || r.stderr);

    ssh.dispose();
})().catch(e => { console.error(e.message); process.exit(1); });
