const { NodeSSH } = require('node-ssh');
const path = require('path');

(async () => {
    const ssh = new NodeSSH();
    console.log('Connecting to production server...');
    await ssh.connect({
        host: '161.35.216.33',
        username: 'root',
        password: '150893412C@c',
        readyTimeout: 30000
    });
    console.log('Connected.');

    console.log('Uploading local shift.routes.ts to /root/anesth/server/src/routes/...');
    const localDir = path.join(__dirname, 'src/routes');
    await ssh.putDirectory(localDir, '/root/anesth/server/src/routes', {
        recursive: true,
        concurrency: 10,
        validate: function (itemPath) {
            const baseName = path.basename(itemPath);
            return baseName.endsWith('.ts');
        }
    });

    console.log('Upload complete.');

    console.log('Rebuilding and restarting docker server container...');
    const result = await ssh.execCommand('docker compose up -d --build server', {
        cwd: '/root/anesth'
    });

    if (result.stderr) {
        console.error('STDERR:', result.stderr);
    }
    if (result.stdout) {
        console.log('STDOUT:', result.stdout);
    }

    console.log('Backend deploy successful.');
    ssh.dispose();
})().catch(e => {
    console.error('Deployment failed:', e);
    process.exit(1);
});
