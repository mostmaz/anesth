const { NodeSSH } = require('node-ssh');
const fs = require('fs');
(async () => {
    const ssh = new NodeSSH();
    try {
        await ssh.connect({
            host: '161.35.216.33',
            username: 'root',
            password: '150893412C@c',
            readyTimeout: 30000
        });

        let r = await ssh.execCommand('cat /root/anesth/server/src/services/labImportService.ts');
        fs.writeFileSync('remote_lab.ts', r.stdout, 'utf8');

        ssh.dispose();
    } catch (e) {
        console.error("Error:", e.message);
        process.exit(1);
    }
})();
