/**
 * quick_ssh_check.js
 * Sends ONE combined shell command to get all needed info fast.
 */

const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

ssh.connect({
    host: '161.35.216.33',
    username: 'root',
    password: '150893412C@c',
    readyTimeout: 20000,
}).then(async () => {
    console.log('Connected!\n');

    // One big command that gets everything in one SSH round-trip
    const cmd = [
        'echo "=== CONTAINERS ==="',
        'docker ps --format "{{.Names}} | {{.Status}}"',
        'echo "=== ENV DATABASE_URL ==="',
        'docker inspect $(docker ps -q) --format "Container: {{.Name}} | {{range .Config.Env}}{{.}} {{end}}" 2>/dev/null | grep -i database',
        'echo "=== DOCKER-COMPOSE ==="',
        'find /root -name "docker-compose*.yml" 2>/dev/null | xargs cat 2>/dev/null',
    ].join(' && ');

    const r = await ssh.execCommand(cmd, { execOptions: { pty: false } });
    console.log(r.stdout || '(no output)');
    if (r.stderr) console.error('STDERR:', r.stderr.substring(0, 1000));
    ssh.dispose();
}).catch(err => {
    console.error('SSH failed:', err.message);
    process.exit(1);
});
