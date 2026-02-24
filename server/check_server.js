const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

ssh.connect({
    host: '161.35.216.33',
    username: 'root',
    password: '150893412C@c'
}).then(async () => {
    const exec = async (cmd, cwd = '/root') => {
        console.log(`Executing: ${cmd}`);
        const result = await ssh.execCommand(cmd, { cwd });
        if (result.stdout) console.log('STDOUT: \n' + result.stdout);
        if (result.stderr) console.error('STDERR: \n' + result.stderr);
    };

    try {
        console.log('--- Server Logs ---');
        await exec('docker logs --tail 20 icu_server_prod', '/root/anesth');

        console.log('--- Running Seed ---');
        await exec('docker exec icu_server_prod npx ts-node src/seed.ts', '/root/anesth');

    } catch (err) {
        console.error(err);
    } finally {
        ssh.dispose();
    }
}).catch(console.error);
