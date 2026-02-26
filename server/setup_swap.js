const { NodeSSH } = require('node-ssh');

(async () => {
    const ssh = new NodeSSH();
    await ssh.connect({ host: '161.35.216.33', username: 'root', password: '150893412C@c', readyTimeout: 30000 });
    console.log('Connected to remote server!');

    const exec = async (cmd) => {
        console.log(`\n$ ${cmd}`);
        const r = await ssh.execCommand(cmd);
        if (r.stdout) console.log(r.stdout);
        if (r.stderr) console.error(r.stderr);
    };

    // Check if swap is already on
    let r = await ssh.execCommand('swapon --show');
    if (r.stdout.includes('/swapfile')) {
        console.log('Swap already enabled.');
    } else {
        console.log('Setting up 2GB swap file...');
        await exec('fallocate -l 2G /swapfile');
        await exec('chmod 600 /swapfile');
        await exec('mkswap /swapfile');
        await exec('swapon /swapfile');
        // Make it permanent
        await exec('echo "/swapfile none swap sw 0 0" >> /etc/fstab');
        console.log('Swap configured!');
    }

    await exec('free -m');

    ssh.dispose();
})().catch(e => { console.error(e.message); process.exit(1); });
