const { NodeSSH } = require('node-ssh');
const path = require('path');

const ssh = new NodeSSH();

async function deployFrontend() {
    try {
        console.log("Connecting to production server...");
        await ssh.connect({
            host: '161.35.216.33',
            username: 'root',
            password: '150893412C@c',
            readyTimeout: 30000
        });
        console.log("Connected.");

        const localSrcDir = path.join(__dirname, '../client/src');
        const remoteSrcDir = '/root/anesth/client/src';

        console.log("Uploading local client/src to " + remoteSrcDir + "...");
        await ssh.putDirectory(localSrcDir, remoteSrcDir, {
            recursive: true,
            concurrency: 10
        });
        console.log("Upload complete.");

        console.log("Rebuilding and restarting docker client container...");
        const result = await ssh.execCommand('docker compose up -d --build client', { cwd: '/root/anesth' });
        console.log(result.stdout);
        if (result.stderr) console.error("STDERR:", result.stderr);

        console.log("Frontend deploy successful.");
    } catch (e) {
        console.error("Deployment failed:", e);
    } finally {
        ssh.dispose();
    }
}

deployFrontend();
