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

        console.log('Downloading screenshot from prod container...');
        // Copy from container to host first
        await ssh.execCommand('docker cp icu_server_prod:/app/uploads/portal_search_nouri.png /tmp/portal_search_nouri.png');
        // Download from host to local
        await ssh.getFile('c:/Users/Administrator/Documents/d/ICU-Manager/server/portal_search_nouri.png', '/tmp/portal_search_nouri.png');
        console.log('DOWNLOAD_DONE');
        ssh.dispose();
    } catch (e) {
        console.error("SSH failed:", e.message);
        process.exit(1);
    }
})();
