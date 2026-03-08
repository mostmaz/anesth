const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
(async () => {
    try {
        await ssh.connect({ host: '161.35.216.33', username: 'root', password: '150893412C@c' });

        console.log('Finding latest screenshot inside container...');
        let r = await ssh.execCommand('docker exec icu_server_prod ls -t /app/uploads/sync-*.png | head -n 1');
        const containerPath = r.stdout.trim();

        if (!containerPath) {
            console.log('No recent screenshots found in container.');
            ssh.dispose();
            return;
        }

        console.log(`Copying ${containerPath} from container to host...`);
        const filename = containerPath.split('/').pop();
        await ssh.execCommand(`docker exec icu_server_prod cat ${containerPath} > /tmp/${filename}`);

        const localPath = 'c:\\Users\\Administrator\\Documents\\d\\ICU-Manager\\server\\recent_blank_sync.png';
        console.log(`Downloading /tmp/${filename} to ${localPath}...`);
        await ssh.getFile(localPath, `/tmp/${filename}`);

        console.log('Download complete.');
        ssh.dispose();
    } catch (e) {
        console.error(e);
    }
})();
