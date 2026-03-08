const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
(async () => {
    try {
        await ssh.connect({ host: '161.35.216.33', username: 'root', password: '150893412C@c' });
        let r = await ssh.execCommand('docker ps --filter name=icu_server_prod --format "{{.Status}}"');
        console.log('Server Uptime:', r.stdout);

        let logs = await ssh.execCommand('docker logs icu_server_prod --tail 100');
        console.log('--- Latest Logs ---');
        console.log(logs.stdout || logs.stderr);

        ssh.dispose();
    } catch (e) {
        console.error(e);
    }
})();
