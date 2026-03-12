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

        console.log('--- Fetching labImportService.ts ---');
        let r = await ssh.execCommand('cat /root/anesth/server/src/services/labImportService.ts');
        console.log(r.stdout || r.stderr);

        ssh.dispose();
    } catch (e) {
        console.error("Error:", e.message);
        process.exit(1);
    }
})();
