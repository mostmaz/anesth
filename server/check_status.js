const { NodeSSH } = require('node-ssh');

async function tryConnect(maxRetries = 5) {
    const ssh = new NodeSSH();
    for (let i = 1; i <= maxRetries; i++) {
        try {
            console.log(`Attempt ${i}/${maxRetries}...`);
            await ssh.connect({ host: '161.35.216.33', username: 'root', password: '150893412C@c', readyTimeout: 60000 });
            console.log('Connected!\n');
            return ssh;
        } catch (e) {
            console.log(`Attempt ${i} failed: ${e.message}`);
            if (i < maxRetries) await new Promise(r => setTimeout(r, 10000));
        }
    }
    throw new Error('All retries failed');
}

(async () => {
    const ssh = await tryConnect(6);
    const exec = async (label, cmd) => {
        console.log(`$ ${label}`);
        const r = await ssh.execCommand(cmd, { cwd: '/root/anesth' });
        if (r.stdout) console.log(r.stdout);
        if (r.stderr) console.error(r.stderr);
        console.log('');
    };
    await exec('docker ps', 'docker ps --format "{{.Names}}\\t{{.Status}}"');
    await exec('server logs (last 20)', 'docker logs --tail 20 icu_server_prod 2>&1');
    ssh.dispose();
})().catch(e => { console.error(e.message); process.exit(1); });
