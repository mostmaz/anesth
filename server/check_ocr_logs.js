const { NodeSSH } = require('node-ssh');

(async () => {
    const ssh = new NodeSSH();
    await ssh.connect({ host: '161.35.216.33', username: 'root', password: '150893412C@c', readyTimeout: 30000 });

    // Check logs containing 'ocr' or errors
    let r = await ssh.execCommand('docker logs --tail 200 --timestamps icu_server_prod 2>&1 | grep -i -E "ocr|error|fail|analyze"');
    console.log('\n--- Server Logs (Filtered) ---');
    console.log(r.stdout || r.stderr);

    ssh.dispose();
})().catch(e => { console.error(e.message); process.exit(1); });
