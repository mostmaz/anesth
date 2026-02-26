const { NodeSSH } = require('node-ssh');

(async () => {
    const ssh = new NodeSSH();
    await ssh.connect({ host: '161.35.216.33', username: 'root', password: '150893412C@c', readyTimeout: 30000 });

    console.log('--- Git pull ---');
    let r = await ssh.execCommand('git pull origin main', { cwd: '/root/anesth' });
    console.log(r.stdout || r.stderr);

    console.log('\n--- Restarting Server Container ---');
    r = await ssh.execCommand('docker restart icu_server_prod', { cwd: '/root/anesth' });
    console.log(r.stdout || r.stderr);

    ssh.dispose();
})().catch(e => { console.error(e.message); process.exit(1); });
