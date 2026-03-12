
const { NodeSSH } = require('node-ssh');

(async () => {
    const ssh = new NodeSSH();
    try {
        await ssh.connect({
            host: '161.35.216.33',
            username: 'root',
            password: '150893412C@c'
        });

        console.log('Retrieving container logs...');
        const result = await ssh.execCommand('docker logs icu_server_prod --tail 200');

        console.log('--- CONTAINER LOGS ---');
        console.log(result.stdout);
        console.log('--- END LOGS ---');

    } catch (err) {
        console.error('Failed to get logs:', err.message);
    } finally {
        ssh.dispose();
    }
})();
