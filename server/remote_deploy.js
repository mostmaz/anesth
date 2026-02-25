const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

(async () => {
    console.log('Connecting to remote server...');
    await ssh.connect({ host: '161.35.216.33', username: 'root', password: '150893412C@c', readyTimeout: 30000 });
    console.log('Connected!\n');

    const exec = async (cmd) => {
        console.log(`\n$ ${cmd}`);
        const r = await ssh.execCommand(cmd, { cwd: '/root/anesth', execOptions: { pty: false } });
        if (r.stdout) process.stdout.write(r.stdout + '\n');
        if (r.stderr) process.stderr.write(r.stderr + '\n');
        return r;
    };

    try {
        await exec('git pull origin main');
        await exec('docker compose up -d --build 2>&1');
    } finally {
        ssh.dispose();
    }
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
