const { NodeSSH } = require('node-ssh');

async function tryConnect(retries = 5) {
    for (let i = 0; i < retries; i++) {
        try {
            console.log(`Connection attempt ${i + 1}...`);
            const ssh = new NodeSSH();
            await ssh.connect({
                host: '161.35.216.33',
                username: 'root',
                password: '150893412C@c',
                readyTimeout: 30000,
                keepaliveInterval: 5000,
            });
            return ssh;
        } catch (e) {
            console.log(`Attempt ${i + 1} failed: ${e.message}`);
            await new Promise(r => setTimeout(r, 5000));
        }
    }
    throw new Error('All connection attempts failed');
}

(async () => {
    const ssh = await tryConnect();

    const exec = async (cmd) => {
        console.log(`> ${cmd.substring(0, 120)}`);
        const result = await ssh.execCommand(cmd);
        if (result.stdout) console.log(result.stdout.substring(0, 500));
        if (result.stderr) console.error(result.stderr.substring(0, 300));
        return result;
    };

    try {
        // Kill any stuck docker build processes
        console.log('--- Killing stuck processes ---');
        await exec('pkill -f "docker build" 2>/dev/null || true');
        await new Promise(r => setTimeout(r, 2000));

        // Now check what containers are up
        await exec('docker ps --format "{{.Names}} {{.Status}}"');

        // Start the client container if it's not running (it was stopped for build)
        await exec('docker start icu_client_prod 2>/dev/null || true');
        await new Promise(r => setTimeout(r, 2000));

        // Patch the compiled JS bundle directly inside the nginx container
        console.log('--- Patching JS bundle (instant) ---');
        const r = await exec(
            `docker exec icu_client_prod sh -c "find /usr/share/nginx/html/assets -name '*.js' | xargs grep -l 'localhost:3001' 2>/dev/null | xargs -r sed -i 's|http://localhost:3001|http://161.35.216.33:3001|g' && echo DONE || echo NO_MATCH"`
        );

        if (r.stdout?.includes('DONE')) {
            console.log('Patched successfully!');
        } else {
            // Maybe already patched or container had different content
            const check = await exec(`docker exec icu_client_prod sh -c "grep -rl '161.35.216.33' /usr/share/nginx/html/assets/ 2>/dev/null | wc -l"`);
            console.log(`Files with Droplet IP: ${check.stdout?.trim()}`);
        }
    } finally {
        ssh.dispose();
    }
})();
