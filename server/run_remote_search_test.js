
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

        const localTestScript = 'c:/Users/Administrator/Documents/d/ICU-Manager/server/test_remote_search.js';
        const remoteTestScript = '/tmp/test_remote_search.js';

        console.log('Pushing test search script to server...');
        await ssh.putFile(localTestScript, remoteTestScript);

        console.log('Copying to container and executing...');
        await ssh.execCommand(`docker cp ${remoteTestScript} icu_server_prod:/app/test_remote_search.js`);

        const testResult = await ssh.execCommand('docker exec icu_server_prod node test_remote_search.js');
        console.log('STDOUT:', testResult.stdout);
        console.log('STDERR:', testResult.stderr);

        console.log('Downloading screenshot and HTML...');
        const remoteScreenshot = '/tmp/search_result.png';
        const localScreenshot = path.join(__dirname, 'search_result.png');
        await ssh.execCommand(`docker cp icu_server_prod:/app/uploads/search_result.png ${remoteScreenshot}`);
        await ssh.getFile(localScreenshot, remoteScreenshot);
        console.log('Screenshot downloaded to:', localScreenshot);

        const remoteHtml = '/tmp/search_result.html';
        const localHtml = path.join(__dirname, 'search_result.html');
        await ssh.execCommand(`docker cp icu_server_prod:/app/uploads/search_result.html ${remoteHtml}`);
        await ssh.getFile(localHtml, remoteHtml);
        console.log('HTML downloaded to:', localHtml);

    } catch (err) {
        console.error('Task failed:', err.message);
    } finally {
        ssh.dispose();
    }
})();
