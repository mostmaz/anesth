const { NodeSSH } = require('node-ssh');

(async () => {
    const ssh = new NodeSSH();
    await ssh.connect({ host: '161.35.216.33', username: 'root', password: '150893412C@c', readyTimeout: 30000 });

    const newKey = 'AIzaSyBB4SAZuwcLnGs085wAj98kWT7sp1tTLO0';
    console.log('--- Updating .env on Remote ---');

    // Command to check if key exists and replace it, or append if it doesn't
    const updateCmd = `
        cd /root/anesth
        if grep -q "^GEMINI_API_KEY=" .env; then
            sed -i 's/^GEMINI_API_KEY=.*/GEMINI_API_KEY=${newKey}/' .env
        else
            echo "GEMINI_API_KEY=${newKey}" >> .env
        fi
    `.trim();

    let r = await ssh.execCommand(updateCmd);
    if (r.stderr) console.error("Error updating .env:", r.stderr);
    console.log("Updated .env successfully.");

    console.log('\n--- Restarting Server Container ---');
    r = await ssh.execCommand('docker compose up -d --force-recreate server', { cwd: '/root/anesth' });
    console.log(r.stdout || r.stderr);

    console.log('\n--- Verifying API Key is active ---');
    r = await ssh.execCommand('docker exec icu_server_prod node -e "console.log(process.env.GEMINI_API_KEY)"');
    // Hide the key in logs to be safe, just print length or success
    if (r.stdout.trim() === newKey) {
        console.log("SUCCESS: Key is loaded in the container.");
    } else {
        console.log("FAIL: Loaded key mismatch or not found.");
        console.log("Actual output:", r.stdout, r.stderr);
    }

    ssh.dispose();
})().catch(e => { console.error(e.message); process.exit(1); });
