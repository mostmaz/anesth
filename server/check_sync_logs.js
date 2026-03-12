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

        console.log(`Checking docker logs for recent activity...`);

        // Get recent logs matching Nouri or Sync
        const r = await ssh.execCommand('docker logs --tail 100 icu_server_prod 2>&1 | grep -iE "Sync|Nouri|Search"');
        console.log('========== STDOUT ==========');
        console.log(r.stdout);

        ssh.dispose();
    } catch (e) {
        console.error("SSH failed:", e.message);
        process.exit(1);
    }
})();
