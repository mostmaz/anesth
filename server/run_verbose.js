
const { NodeSSH } = require('node-ssh');
const path = require('path');

(async () => {
    const ssh = new NodeSSH();
    try {
        await ssh.connect({
            host: '161.35.216.33',
            username: 'root',
            password: '150893412C@c'
        });

        const localPath = 'c:/Users/Administrator/Documents/d/ICU-Manager/server/sync_verbose.js';
        const remoteTmp = '/tmp/sync_verbose.js';

        console.log('Pushing sync_verbose.js to server...');
        await ssh.putFile(localPath, remoteTmp);

        console.log('Copying to container and executing...');
        await ssh.execCommand(`docker cp ${remoteTmp} icu_server_prod:/app/sync_verbose.js`);

        const result = await ssh.execCommand('docker exec icu_server_prod node sync_verbose.js');

        console.log('--- REMOTE SYNC LOGS ---');
        console.log('STDOUT:', result.stdout);
        console.log('STDERR:', result.stderr);

    } catch (err) {
        console.error('Task failed:', err.message);
    } finally {
        ssh.dispose();
    }
})();
