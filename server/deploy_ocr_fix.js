const { NodeSSH } = require('node-ssh');

(async () => {
    const ssh = new NodeSSH();
    await ssh.connect({ host: '161.35.216.33', username: 'root', password: '150893412C@c', readyTimeout: 30000 });

    // 1. Write the .env file with the Gemini API key
    console.log('--- Writing .env on Remote ---');
    await ssh.execCommand('echo "GEMINI_API_KEY=AIzaSyBlfr5jvnksROJ3thAvDB2BbZJ2PGLM0Wg" > .env', { cwd: '/root/anesth' });

    // 2. Fetch latest docker-compose.yml
    console.log('--- Git pull ---');
    let r = await ssh.execCommand('git pull origin main', { cwd: '/root/anesth' });
    console.log(r.stdout || r.stderr);

    // 3. Restart server container to pick up the new variable
    console.log('\n--- Recreating Server Container ---');
    r = await ssh.execCommand('docker compose up -d server', { cwd: '/root/anesth' });
    console.log(r.stdout || r.stderr);

    ssh.dispose();
})().catch(e => { console.error(e.message); process.exit(1); });
