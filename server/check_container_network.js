const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
(async () => {
    try {
        await ssh.connect({ host: '161.35.216.33', username: 'root', password: '150893412C@c' });
        console.log('Testing network connectivity from container...');
        let r = await ssh.execCommand('docker exec icu_server_prod curl -I https://google.com --connect-timeout 5');
        console.log('Container Curl Output:', r.stdout || r.stderr);
        ssh.dispose();
    } catch (e) {
        console.error(e);
    }
})();
