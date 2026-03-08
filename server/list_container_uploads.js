const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
(async () => {
    try {
        await ssh.connect({ host: '161.35.216.33', username: 'root', password: '150893412C@c' });
        console.log('Listing /app/uploads/ inside container...');
        let r = await ssh.execCommand('docker exec icu_server_prod ls -lh /app/uploads/');
        console.log('STDOUT:', r.stdout);
        console.log('STDERR:', r.stderr);
        ssh.dispose();
    } catch (e) {
        console.error(e);
    }
})();
