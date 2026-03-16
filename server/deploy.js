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
        if (result.stdout) console.log('STDOUT: ' + result.stdout.substring(0, 500));
        if (result.stderr) console.error('STDERR: ' + result.stderr.substring(0, 500));
        if (result.code !== 0) throw new Error(`Command failed: ${cmd}`);
    };

    try {
        await exec('if [ ! -d "anesth" ]; then git clone https://github.com/mostmaz/anesth.git; fi');
        await exec('git fetch origin', '/root/anesth');
        await exec('git reset --hard origin/master', '/root/anesth');

        console.log('Replacing IP in docker-compose...');
        await exec('sed -i "s/VITE_API_URL=\\${VITE_API_URL:-http:\\/\\/localhost:3001\\/api}/VITE_API_URL=\\${VITE_API_URL:-http:\\/\\/161.35.216.33:3001\\/api}/g" docker-compose.yml', '/root/anesth');

        // Removed hardcoded GEMINI_API_KEY. It should be managed via the server/.env file on the host.

        console.log('Building and running Production Containers...');
        await exec('docker compose up -d --build', '/root/anesth');

        console.log('Waiting for database to initialize...');
        await new Promise(resolve => setTimeout(resolve, 8000));

        await exec('docker exec icu_server_prod npx prisma db push --accept-data-loss', '/root/anesth');
        console.log('Deployment successful!');
    } catch (err) {
        console.error(err);
        process.exit(1);
    } finally {
        ssh.dispose();
    }
}).catch(err => {
    console.error("Connection failed:", err);
    process.exit(1);
});
