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

        console.log('Fetching last 300 lines of docker logs...');
        const r = await ssh.execCommand('docker logs --tail 300 icu_server_prod');
        console.log('========== STDOUT ==========');
        console.log(r.stdout);
        if (r.stderr) {
            console.log('========== STDERR ==========');
            console.log(r.stderr);
        }

        ssh.dispose();
    } catch (e) {
        console.error("SSH failed:", e.message);
        process.exit(1);
    }
})();
