const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

(async () => {
    console.log('Connecting...');
    await ssh.connect({ host: '161.35.216.33', username: 'root', password: '150893412C@c', readyTimeout: 30000 });
    console.log('Connected!\n');

    const exec = async (label, cmd) => {
        console.log(`\n$ ${label}`);
        const r = await ssh.execCommand(cmd, { cwd: '/root/anesth', execOptions: { pty: false } });
        if (r.stdout) process.stdout.write(r.stdout + '\n');
        if (r.stderr) process.stderr.write(r.stderr + '\n');
        return r;
    };

    try {
        // Check if containers are running
        await exec('docker ps', 'docker ps --format "{{.Names}}\\t{{.Status}}"');

        // Push schema
        await exec('prisma db push', 'docker exec icu_server_prod npx prisma db push --accept-data-loss 2>&1');

        // Check logs
        await exec('server logs', 'docker logs --tail 30 icu_server_prod 2>&1');
    } finally {
        ssh.dispose();
    }
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
