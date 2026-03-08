const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

(async () => {
    await ssh.connect({ host: '161.35.216.33', username: 'root', password: '150893412C@c' });
    console.log('Connected to SSH');

    console.log('--- Checking client container logs ---');
    const logs = await ssh.execCommand('docker logs icu_client_prod --tail 100');
    console.log(logs.stdout || logs.stderr);

    console.log('\n--- Listing files in Nginx html directory ---');
    const files = await ssh.execCommand('docker exec icu_client_prod ls -R /usr/share/nginx/html');
    console.log(files.stdout);

    console.log('\n--- Reading index.html from remote ---');
    const index = await ssh.execCommand('docker exec icu_client_prod cat /usr/share/nginx/html/index.html');
    console.log(index.stdout);

    ssh.dispose();
})().catch(e => console.error(e));
