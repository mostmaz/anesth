
const { NodeSSH } = require('node-ssh');
const path = require('path');
const fs = require('fs');

async function getScreenshot() {
    const ssh = new NodeSSH();
    console.log('Connecting to server...');
    await ssh.connect({
        host: '161.35.216.33',
        username: 'root',
        password: '150893412C@c'
    });

    console.log('Finding latest fail_search screenshot in container (searching from root)...');
    const result = await ssh.execCommand('docker exec icu_server_prod find / -name "fail_search_*.png" | head -n 1');
    const remoteInContainer = result.stdout.trim();

    if (!remoteInContainer) {
        console.log('No screenshot found in container.');
        ssh.dispose();
        return;
    }

    const localName = path.basename(remoteInContainer);
    const remotePath = `/tmp/${localName}`;
    const localPath = path.join(__dirname, localName);

    console.log(`Copying ${remoteInContainer} out of container to ${remotePath}...`);
    await ssh.execCommand(`docker cp icu_server_prod:${remoteInContainer} ${remotePath}`);

    console.log(`Downloading ${remotePath} to ${localPath}...`);
    await ssh.getFile(localPath, remotePath);
    console.log('Download complete.');
    ssh.dispose();
}

getScreenshot().catch(console.error);
