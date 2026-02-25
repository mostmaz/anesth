const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

(async () => {
    await ssh.connect({ host: '161.35.216.33', username: 'root', password: '150893412C@c', readyTimeout: 30000 });
    console.log('Connected!\n');

    const exec = async (label, cmd) => {
        console.log(`$ ${label}`);
        const r = await ssh.execCommand(cmd, { cwd: '/root/anesth' });
        if (r.stdout) console.log(r.stdout);
        if (r.stderr) console.error(r.stderr);
    };

    await exec('docker ps', 'docker ps --format "{{.Names}}\\t{{.Status}}"');
    await exec('server logs', 'docker logs --tail 15 icu_server_prod 2>&1');

    ssh.dispose();
})().catch(e => { console.error(e.message); process.exit(1); });
