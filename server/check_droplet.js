const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

ssh.connect({
    host: '161.35.216.33',
    username: 'root',
    password: '150893412C@c'
}).then(async () => {
    console.log('Connected to DigitalOcean Droplet via SSH!');

    const exec = async (cmd, cwd = '/root') => {
        console.log(`Executing: ${cmd}`);
        const result = await ssh.execCommand(cmd, { cwd });
        if (result.stdout) console.log('STDOUT: ' + result.stdout);
        if (result.stderr) console.error('STDERR: ' + result.stderr);
        return result;
    };

    try {
        await exec('docker ps -a');
        await exec('docker network ls');
        await exec('docker compose -f /root/anesth/docker-compose.yml ps');
    } catch (err) {
        console.error(err);
    } finally {
        ssh.dispose();
    }
}).catch(err => {
    console.error("Connection failed:", err);
});
