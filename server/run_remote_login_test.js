
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

        const localTestScript = 'c:/Users/Administrator/Documents/d/ICU-Manager/server/test_remote_login.js';
        const remoteTestScript = '/tmp/test_remote_login.js';

        console.log('Pushing test script to server...');
        await ssh.putFile(localTestScript, remoteTestScript);

        console.log('Copying to container and executing...');
        await ssh.execCommand(`docker cp ${remoteTestScript} icu_server_prod:/app/test_remote_login.js`);

        const testResult = await ssh.execCommand('docker exec icu_server_prod node test_remote_login.js');
        console.log('STDOUT:', testResult.stdout);
        console.log('STDERR:', testResult.stderr);

        console.log('Downloading screenshot...');
        const remoteScreenshot = '/tmp/login_result.png';
        const localScreenshot = path.join(__dirname, 'login_result.png');
        await ssh.execCommand(`docker cp icu_server_prod:/app/uploads/login_result.png ${remoteScreenshot}`);
        await ssh.getFile(localScreenshot, remoteScreenshot);
        console.log('Screenshot downloaded to:', localScreenshot);

    } catch (err) {
        console.error('Task failed:', err.message);
    } finally {
        ssh.dispose();
    }
})();
