
const { NodeSSH } = require('node-ssh');
const path = require('path');
const fs = require('fs');

(async () => {
    const ssh = new NodeSSH();
    try {
        await ssh.connect({
            host: '161.35.216.33',
            username: 'root',
            password: '150893412C@c'
        });

        const localScriptPath = 'c:/Users/Administrator/Documents/d/ICU-Manager/server/inspect_selectors.js';
        const remoteTmpPath = '/tmp/inspect_selectors.js';

        console.log('Pushing inspection script to server...');
        await ssh.putFile(localScriptPath, remoteTmpPath);

        console.log('Copying to container and executing...');
        await ssh.execCommand(`docker cp ${remoteTmpPath} icu_server_prod:/app/inspect_selectors.js`);
        const result = await ssh.execCommand('docker exec icu_server_prod node inspect_selectors.js');

        console.log('--- INSPECTION RESULTS ---');
        console.log('STDOUT:', result.stdout);
        console.log('STDERR:', result.stderr);

    } catch (err) {
        console.error('Task failed:', err.message);
    } finally {
        ssh.dispose();
    }
})();
