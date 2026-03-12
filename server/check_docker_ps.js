const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
(async () => {
    try {
        await ssh.connect({ host: '161.35.216.33', username: 'root', password: '150893412C@c' });
        const res = await ssh.execCommand('docker ps');
        console.log(res.stdout);
    } catch (e) {
        console.error(e);
    } finally {
        ssh.dispose();
    }
})();
