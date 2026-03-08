const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
(async () => {
    try {
        await ssh.connect({ host: '161.35.216.33', username: 'root', password: '150893412C@c' });
        console.log('Testing connectivity to google.com via Node inside container...');

        const nodeCode = `
require('https').get('https://google.com', (res) => {
    console.log('Status:', res.statusCode);
    process.exit(0);
}).on('error', (e) => {
    console.error('Error:', e.message);
    process.exit(1);
});
        `.trim();

        let r = await ssh.execCommand(`docker exec icu_server_prod node -e "${nodeCode.replace(/"/g, '\\"').replace(/\n/g, '')}"`);
        console.log('Node Test Output:', r.stdout || r.stderr);
        ssh.dispose();
    } catch (e) {
        console.error(e);
    }
})();
