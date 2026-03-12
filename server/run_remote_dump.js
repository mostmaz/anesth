
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

        const localTestScript = 'c:/Users/Administrator/Documents/d/ICU-Manager/server/test_login_dump.js';
        const remoteTestScript = '/tmp/test_login_dump.js';

        console.log('Pushing dump script to server...');
        await ssh.putFile(localTestScript, remoteTestScript);

        console.log('Copying to container and executing...');
        await ssh.execCommand(`docker cp ${remoteTestScript} icu_server_prod:/app/test_login_dump.js`);

        const testResult = await ssh.execCommand('docker exec icu_server_prod node test_login_dump.js');
        console.log('STDOUT:', testResult.stdout);
        console.log('STDERR:', testResult.stderr);

        console.log('Downloading screenshot and HTML...');
        const remoteScreenshot = '/tmp/login_page.png';
        const localScreenshot = path.join(__dirname, 'login_page.png');
        await ssh.execCommand(`docker cp icu_server_prod:/app/uploads/login_page.png ${remoteScreenshot}`);
        await ssh.getFile(localScreenshot, remoteScreenshot);
        console.log('Screenshot downloaded to:', localScreenshot);

        const remoteHtml = '/tmp/page.html';
        const localHtml = path.join(__dirname, 'page.html');
        await ssh.execCommand(`docker cp icu_server_prod:/app/uploads/page.html ${remoteHtml}`);
        await ssh.getFile(localHtml, remoteHtml);
        console.log('HTML downloaded to:', localHtml);

    } catch (err) {
        console.error('Task failed:', err.message);
    } finally {
        ssh.dispose();
    }
})();
