const { NodeSSH } = require('node-ssh');

(async () => {
    const ssh = new NodeSSH();
    try {
        await ssh.connect({
            host: '161.35.216.33',
            username: 'root',
            password: '150893412C@c',
            readyTimeout: 30000
        });

        console.log('Fetching last 1000 lines of docker logs...');
        const r = await ssh.execCommand('docker logs --tail 1000 icu_server_prod');
        console.log('--- LOGS START ---');
        console.log(r.stdout);
        console.log('--- LOGS END ---');

        const r2 = await ssh.execCommand('docker ps --filter name=icu_server_prod --format "{{.Status}}"');
        console.log('Container Status: ' + r2.stdout);

        ssh.dispose();
    } catch (e) {
        console.error("SSH failed:", e.message);
        process.exit(1);
    }
})();
