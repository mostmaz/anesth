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

        console.log('--- Checking ocrService.ts in container ---');
        const r1 = await ssh.execCommand('docker exec icu_server_prod grep "modelNames =" /app/src/services/ocrService.ts');
        console.log(r1.stdout || r1.stderr || 'No output for TS');

        console.log('--- Checking ocrService.js in container ---');
        const r2 = await ssh.execCommand('docker exec icu_server_prod grep "modelNames =" /app/dist/services/ocrService.js');
        console.log(r2.stdout || r2.stderr || 'No output for JS');

        ssh.dispose();
    } catch (e) {
        console.error("SSH failed:", e.message);
        process.exit(1);
    }
})();
