const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
(async () => {
    try {
        await ssh.connect({ host: '161.35.216.33', username: 'root', password: '150893412C@c' });

        const curlCmd = `curl -v -X POST http://localhost:3001/api/lab/sync \
-H "Content-Type: application/json" \
-d '{"patientId": "38b62b34-4f1f-496f-974c-fb8fc34d934b", "mrn": "102873-0", "name": "حكمت عبدالرزاق عبدالله سليم"}'`;

        console.log('Running curl on Droplet...');
        let r = await ssh.execCommand(curlCmd);
        console.log('STDOUT:', r.stdout);
        console.log('STDERR:', r.stderr);

        ssh.dispose();
    } catch (e) {
        console.error(e);
    }
})();
