const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
(async () => {
    try {
        await ssh.connect({ host: '161.35.216.33', username: 'root', password: '150893412C@c' });
        console.log('Listing latest screenshots...');
        let r = await ssh.execCommand('ls -lht /root/anesth/server/uploads/sync-*.png | head -n 20');
        console.log(r.stdout);
        ssh.dispose();
    } catch (e) {
        console.error(e);
    }
})();
