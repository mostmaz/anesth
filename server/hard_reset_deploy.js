const { NodeSSH } = require('node-ssh');

(async () => {
    const ssh = new NodeSSH();
    await ssh.connect({ host: '161.35.216.33', username: 'root', password: '150893412C@c', readyTimeout: 30000 });

    console.log('--- Git Hard Reset ---');
    let r = await ssh.execCommand('git fetch origin main && git reset --hard origin/main', { cwd: '/root/anesth' });
    console.log(r.stdout || r.stderr);

    console.log('\n--- Checking docker-compose.yml ---');
    r = await ssh.execCommand('cat docker-compose.yml | grep GEMINI', { cwd: '/root/anesth' });
    console.log(r.stdout || r.stderr);

    console.log('\n--- Recreating Server Container ---');
    // We already put the GEMINI_API_KEY in the .env in a previous step, so it should be picked up now.
    r = await ssh.execCommand('docker compose up -d --force-recreate server', { cwd: '/root/anesth' });
    console.log(r.stdout || r.stderr);

    // Wait 3 seconds
    await new Promise(res => setTimeout(res, 3000));

    console.log('\n--- Verifying Node Server ENV ---');
    r = await ssh.execCommand('docker exec icu_server_prod node -e "console.log(process.env.GEMINI_API_KEY ? \'KEY FOUND\' : \'NO KEY FOUND\')"', { cwd: '/root/anesth' });
    console.log(r.stdout || r.stderr);

    ssh.dispose();
})().catch(e => { console.error(e.message); process.exit(1); });
