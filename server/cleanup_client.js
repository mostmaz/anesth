const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
(async () => {
    try {
        await ssh.connect({ host: '161.35.216.33', username: 'root', password: '150893412C@c' });
        console.log('Force removing client container...');
        await ssh.execCommand('docker rm -f icu_client_prod');
        console.log('Done.');
        ssh.dispose();
    } catch (e) {
        console.error(e);
    }
})();
