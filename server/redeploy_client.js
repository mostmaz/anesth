const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

ssh.connect({
    host: '161.35.216.33',
    username: 'root',
    password: '150893412C@c'
}).then(async () => {
    const exec = async (cmd, cwd = '/root') => {
        const timeout = 600000; // 10 min timeout
        console.log(`Executing: ${cmd}`);
        const result = await ssh.execCommand(cmd, { cwd, execOptions: { timeout } });
        if (result.stdout) console.log('STDOUT: \n' + result.stdout.substring(0, 2000));
        if (result.stderr) console.error('STDERR: \n' + result.stderr.substring(0, 2000));
        return result;
    };

    try {
        // Stop old client
        console.log('--- Stopping client ---');
        await exec('docker stop icu_client_prod && docker rm icu_client_prod', '/root/anesth');

        // Build client image
        console.log('--- Building client image ---');
        await exec(
            'docker build -t anesth-client --build-arg VITE_API_URL=http://161.35.216.33:3001/api ./client',
            '/root/anesth'
        );

        // Run new client
        console.log('--- Starting client ---');
        await exec(
            'docker run -d --name icu_client_prod --restart always -p 80:80 anesth-client',
            '/root/anesth'
        );

        console.log('Client Rebuilt and Started!');
    } catch (err) {
        console.error(err);
    } finally {
        ssh.dispose();
    }
}).catch(console.error);
