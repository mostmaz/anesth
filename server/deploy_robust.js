
const { NodeSSH } = require('node-ssh');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

(async () => {
    const ssh = new NodeSSH();
    try {
        console.log('Build starting (via tsc directly)...');
        // Try npx tsc directly with full node path
        const nodePath = 'C:/Program Files/nodejs/node.exe';
        const npxPath = 'C:/Program Files/nodejs/npx.cmd';

        execSync(`"${npxPath}" tsc`, { cwd: 'c:/Users/Administrator/Documents/d/ICU-Manager/server' });
        console.log('Build successful.');

        await ssh.connect({
            host: '161.35.216.33',
            username: 'root',
            password: '150893412C@c',
            readyTimeout: 30000
        });

        const localPath = 'c:/Users/Administrator/Documents/d/ICU-Manager/server/dist/services/labImportService.js';
        const remoteTmpPath = '/tmp/labImportService.js';

        console.log('Pushing to production...');
        await ssh.putFile(localPath, remoteTmpPath);
        await ssh.execCommand(`docker cp ${remoteTmpPath} icu_server_prod:/app/dist/services/labImportService.js`);

        console.log('Restarting container...');
        await ssh.execCommand('docker restart icu_server_prod');
        console.log('Deployment complete.');

    } catch (err) {
        console.error('Deployment failed:', err.message);
        if (err.stdout) console.log('STDOUT:', err.stdout.toString());
        if (err.stderr) console.log('STDERR:', err.stderr.toString());
    } finally {
        ssh.dispose();
    }
})();
