const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
(async () => {
    try {
        await ssh.connect({ host: '161.35.216.33', username: 'root', password: '150893412C@c' });
        console.log('Searching logs for "Failed to process"...');
        let r = await ssh.execCommand('docker logs icu_server_prod 2>&1 | grep "Failed to process"');
        console.log('Results:', r.stdout || 'None found.');
        ssh.dispose();
    } catch (e) {
        console.error(e);
    }
})();
