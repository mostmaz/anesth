const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

(async () => {
    try {
        await ssh.connect({ host: '161.35.216.33', username: 'root', password: '150893412C@c' });

        // Find the latest screenshot
        let r = await ssh.execCommand('ls -t /root/anesth/server/uploads/sync-*.png | head -n 1');
        const remotePath = r.stdout.trim();

        if (!remotePath) {
            console.log('No screenshots found.');
            ssh.dispose();
            return;
        }

        const localPath = 'c:\\Users\\Administrator\\Documents\\d\\ICU-Manager\\server\\latest_prod_sync.png';
        console.log(`Downloading ${remotePath} to ${localPath}...`);

        await ssh.getFile(localPath, remotePath);
        console.log('Download complete.');

        ssh.dispose();
    } catch (e) {
        console.error(e);
    }
})();
