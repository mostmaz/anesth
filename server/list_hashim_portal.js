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

        const scriptContent = `
const { LabImportService } = require('./dist/services/labImportService');
const service = new LabImportService();
const username = 'icu@amrlab.net';
const password = process.env.LAB_PASSWORD || '1989';

async function run() {
    try {
        const allReports = await service.getPatients(username, password, true, null, 'هاشم ياسين خليل يونس');
        console.log('--- HASHIM YASIN REPORTS ON PORTAL ---');
        allReports.forEach(r => {
            console.log(\`ACC:\${r.accNo} | DATE:\${r.date} | TITLE:\${r.title} | NAME:\${r.name}\`);
        });
    } catch (err) {
        console.error(err);
    }
}
run();
`;

        const localTmpPath = require('path').resolve('tmp_list.js');
        require('fs').writeFileSync(localTmpPath, scriptContent);
        await ssh.putFile(localTmpPath, '/tmp/list_hashim.js');
        await ssh.execCommand('docker cp /tmp/list_hashim.js icu_server_prod:/app/list_hashim.js');
        const result = await ssh.execCommand('docker exec icu_server_prod node list_hashim.js');
        console.log(result.stdout);
        ssh.dispose();
    } catch (err) {
        console.error(err);
    }
})();
