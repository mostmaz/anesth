const { NodeSSH } = require('node-ssh');

(async () => {
    const ssh = new NodeSSH();
    try {
        await ssh.connect({
            host: '161.35.216.33',
            username: 'root',
            password: '150893412C@c',
            readyTimeout: 30000
        });

        const FILE = '/root/anesth/server/src/services/labImportService.ts';

        // Fix 2: syncAndSavePatientLabs still uses importResult.screenshotPath — fix to use importResult.absolutePath
        console.log('--- Patching syncAndSavePatientLabs screenshotPath references ---');

        let r = await ssh.execCommand(
            `sed -i "s|importResult\\.screenshotPath|importResult.absolutePath|g" ${FILE}`
        );
        console.log('Patch2 stdout:', r.stdout, 'stderr:', r.stderr);

        // Verify
        console.log('\n--- Verifying ---');
        r = await ssh.execCommand(`grep -n "screenshotPath\\|absolutePath\\|imageUrl" ${FILE}`);
        console.log(r.stdout || r.stderr);

        // Rebuild
        console.log('\n--- Rebuilding server ---');
        r = await ssh.execCommand('docker compose up -d --build server', { cwd: '/root/anesth' });
        console.log(r.stdout || r.stderr);

        await new Promise(res => setTimeout(res, 12000));

        // Show recent logs
        console.log('\n--- Server logs ---');
        r = await ssh.execCommand('docker logs icu_server_prod --tail 50');
        console.log(r.stdout || r.stderr);

        ssh.dispose();
    } catch (e) {
        console.error("Error:", e.message);
        process.exit(1);
    }
})();
