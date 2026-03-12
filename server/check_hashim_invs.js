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
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        const invs = await prisma.investigation.findMany({
            where: { patientId: '8b0b885c-e27a-454c-bdc8-7ecd85bb96ad' },
            orderBy: { conductedAt: 'desc' }
        });

        console.log('--- INVESTIGATIONS FOR HASHIM (325400-3) ---');
        invs.forEach(i => {
            console.log(\`[\${i.externalId}] ConductedAt: \${i.conductedAt} Title: \${i.title}\`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}
run();
`;

        const localTmpPath = require('path').resolve('tmp_check_invs.js');
        require('fs').writeFileSync(localTmpPath, scriptContent);
        await ssh.putFile(localTmpPath, '/tmp/check_invs.js');
        await ssh.execCommand('docker cp /tmp/check_invs.js icu_server_prod:/app/check_invs.js');
        const result = await ssh.execCommand('docker exec icu_server_prod node check_invs.js');
        console.log(result.stdout);
        ssh.dispose();
    } catch (err) {
        console.error(err);
    }
})();
