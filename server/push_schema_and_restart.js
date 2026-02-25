/**
 * push_schema_and_restart.js
 * Runs prisma db push on the remote server's Docker container, then restarts the server container.
 * This is needed after schema changes (e.g., adding isActive to Medication).
 */

const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const MAX_RETRIES = 3;

async function tryConnect() {
    for (let i = 1; i <= MAX_RETRIES; i++) {
        try {
            console.log(`SSH connect attempt ${i}/${MAX_RETRIES}...`);
            await ssh.connect({
                host: '161.35.216.33',
                username: 'root',
                password: '150893412C@c',
                readyTimeout: 20000,
            });
            console.log('Connected!\n');
            return;
        } catch (e) {
            console.error(`  Attempt ${i} failed: ${e.message}`);
            if (i === MAX_RETRIES) throw e;
            await new Promise(r => setTimeout(r, 3000));
        }
    }
}

(async () => {
    await tryConnect();

    const exec = async (label, cmd) => {
        console.log(`\n> ${label}`);
        const r = await ssh.execCommand(cmd, { execOptions: { pty: false } });
        if (r.stdout) console.log(r.stdout.substring(0, 2000));
        if (r.stderr && r.stderr.trim()) console.log('STDERR:', r.stderr.substring(0, 500));
        return r;
    };

    try {
        // 1. Check what server container is running
        await exec('Container status', 'docker ps --format "{{.Names}} | {{.Status}}"');

        // 2. Run prisma db push inside server container to apply new schema
        console.log('\n--- Pushing schema to remote DB ---');
        await exec(
            'prisma db push',
            'docker exec icu_server_prod npx prisma db push --accept-data-loss 2>&1 || docker exec icu_server_prod npx prisma migrate deploy 2>&1'
        );

        // 3. Restart server container
        console.log('\n--- Restarting server ---');
        await exec('restart', 'docker restart icu_server_prod');
        await new Promise(r => setTimeout(r, 5000));

        // 4. Check logs
        await exec('server logs', 'docker logs --tail 20 icu_server_prod');

    } finally {
        ssh.dispose();
    }
})().catch(e => {
    console.error('Failed:', e.message);
    process.exit(1);
});
