/**
 * check_docker_remote.js
 * SSH into the remote server and check what Docker containers are running
 * and what DATABASE_URL the server container uses.
 */

const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

ssh.connect({
    host: '161.35.216.33',
    username: 'root',
    password: '150893412C@c',
    readyTimeout: 30000,
}).then(async () => {
    console.log('Connected!\n');

    const run = async (cmd) => {
        const r = await ssh.execCommand(cmd);
        if (r.stdout) console.log(r.stdout);
        if (r.stderr) console.error('STDERR:', r.stderr.substring(0, 500));
        return r.stdout;
    };

    console.log('=== Running containers ===');
    await run('docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"');

    console.log('\n=== Server container DATABASE_URL ===');
    await run('docker inspect icu_server_prod --format "{{range .Config.Env}}{{println .}}{{end}}" 2>/dev/null | grep DATABASE || docker inspect icu-manager-server-1 --format "{{range .Config.Env}}{{println .}}{{end}}" 2>/dev/null | grep DATABASE || echo "Could not find server container"');

    console.log('\n=== All container names ===');
    await run('docker ps -a --format "{{.Names}}"');

    console.log('\n=== Remote docker-compose.yml ===');
    await run('cat /root/anesth/docker-compose.yml 2>/dev/null || cat /root/ICU-Manager/docker-compose.yml 2>/dev/null || find /root -name docker-compose.yml 2>/dev/null | head -5');

    ssh.dispose();
}).catch(err => {
    console.error('SSH failed:', err.message);
    process.exit(1);
});
