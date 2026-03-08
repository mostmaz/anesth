const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
(async () => {
    try {
        await ssh.connect({ host: '161.35.216.33', username: 'root', password: '150893412C@c' });
        console.log('Stopping and removing old containers...');
        await ssh.execCommand('docker rm -f icu_server_prod icu_client_prod');
        console.log('Cleanup complete.');
        ssh.dispose();
    } catch (e) {
        console.error(e);
    }
})();
