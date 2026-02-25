const { NodeSSH } = require('node-ssh');

async function tryConnect() {
    const ssh = new NodeSSH();
    await ssh.connect({
        host: '161.35.216.33',
        username: 'root',
        password: '150893412C@c',
        readyTimeout: 30000,
    });
    return ssh;
}

(async () => {
    const ssh = await tryConnect();
    const exec = async (cmd) => {
        console.log(`> ${cmd}`);
        const r = await ssh.execCommand(cmd);
        if (r.stdout) console.log(r.stdout);
        if (r.stderr) console.error(r.stderr.substring(0, 300));
        return r;
    };

    try {
        console.log('--- Container status ---');
        await exec('docker ps -a --format "{{.Names}}\\t{{.Status}}"');

        console.log('--- Starting all stopped containers ---');
        await exec('docker start icu_server_prod icu_client_prod 2>/dev/null || true');
        await new Promise(r => setTimeout(r, 5000));

        console.log('--- Container status after start ---');
        await exec('docker ps --format "{{.Names}}\\t{{.Status}}"');

        console.log('--- Server logs ---');
        await exec('docker logs --tail 10 icu_server_prod');
    } finally {
        ssh.dispose();
    }
})().catch(e => console.error(e.message));
