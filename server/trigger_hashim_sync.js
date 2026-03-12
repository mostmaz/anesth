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
const patientId = '8b0b885c-e27a-454c-bdc8-7ecd85bb96ad';
const authorId = 'system-debug';
const patientName = 'هاشم ياسين خليل يونس';
const mrn = '325400-3';

async function run() {
    console.log('--- STARTING MANUAL SYNC FOR HASHIM (8b0b885c) ---');
    try {
        const results = await service.syncAndSavePatientLabs(mrn, patientId, authorId, patientName);
        console.log('Sync completed. Results:', JSON.stringify(results, null, 2));
    } catch (err) {
        console.error('Sync failed:', err);
    }
}
run();
`;

        const localTmpPath = require('path').resolve('tmp_sync_manual.js');
        require('fs').writeFileSync(localTmpPath, scriptContent);
        await ssh.putFile(localTmpPath, '/tmp/sync_manual.js');
        await ssh.execCommand('docker cp /tmp/sync_manual.js icu_server_prod:/app/sync_manual.js');

        console.log('Executing sync in container...');
        const result = await ssh.execCommand('docker exec icu_server_prod node sync_manual.js');
        console.log('STDOUT:', result.stdout);
        console.log('STDERR:', result.stderr);

        ssh.dispose();
    } catch (err) {
        console.error(err);
    }
})();
