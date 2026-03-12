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

        console.log(`Grepping docker logs for Sync...`);

        // Get logs matching Sync
        const r = await ssh.execCommand('docker logs icu_server_prod 2>&1 | grep -E "Sync|Fetching List|Searching for" | tail -n 50');
        console.log('========== STDOUT ==========');
        console.log(r.stdout);

        ssh.dispose();
    } catch (e) {
        console.error("SSH failed:", e.message);
        process.exit(1);
    }
})();
