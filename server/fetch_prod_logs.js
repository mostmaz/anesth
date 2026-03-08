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

        console.log('--- Fetching icu_server_prod logs ---');
        let r = await ssh.execCommand('docker logs icu_server_prod --tail 200');
        console.log(r.stdout || r.stderr);

        ssh.dispose();
    } catch (e) {
        console.error("Error:", e.message);
        process.exit(1);
    }
})();
