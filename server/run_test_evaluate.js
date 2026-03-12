
const { NodeSSH } = require('node-ssh');

(async () => {
    const ssh = new NodeSSH();
    try {
        await ssh.connect({
            host: '161.35.216.33',
            username: 'root',
            password: '150893412C@c'
        });

        const localTestScript = 'c:/Users/Administrator/Documents/d/ICU-Manager/server/test_evaluate.js';
        const remoteTestScript = '/tmp/test_evaluate.js';

        console.log('Pushing test evaluate script...');
        await ssh.putFile(localTestScript, remoteTestScript);

        console.log('Executing...');
        await ssh.execCommand(`docker cp ${remoteTestScript} icu_server_prod:/app/test_evaluate.js`);
        const testResult = await ssh.execCommand('docker exec icu_server_prod node test_evaluate.js');

        console.log('STDOUT:\n', testResult.stdout);
        console.log('STDERR:\n', testResult.stderr);

    } catch (err) {
        console.error('Task failed:', err.message);
    } finally {
        ssh.dispose();
    }
})();
