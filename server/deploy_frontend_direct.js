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

        const localDistDir = path.join(__dirname, '../client/dist');
        const remoteDistDir = '/root/icu/ICU-Manager/client/dist';

        console.log("Uploading built client files to " + remoteDistDir + "...");
        await ssh.putDirectory(localDistDir, remoteDistDir, {
            recursive: true,
            concurrency: 10
        });
        console.log("Upload complete.");

        console.log("Emptying nginx html directory and copying new dist...");
        const cmds = `
            rm -rf /var/www/html/*
            cp -r /root/icu/ICU-Manager/client/dist/* /var/www/html/
            systemctl restart nginx
        `;
        const result = await ssh.execCommand(cmds);
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
