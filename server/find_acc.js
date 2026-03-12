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
            where: { externalId: '2260311100' },
            include: { patient: true }
        });

        console.log('--- GLOBAL SEARCH FOR ACC: 2260311100 ---');
        invs.forEach(i => {
            console.log(\`Investigation ID: \${i.id}\`);
            console.log(\`Patient ID: \${i.patientId}\`);
            console.log(\`Patient Name: \${i.patient.name}\`);
            console.log(\`Patient MRN: \${i.patient.mrn}\`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}
run();
`;

        const localTmpPath = require('path').resolve('tmp_find_acc.js');
        require('fs').writeFileSync(localTmpPath, scriptContent);
        await ssh.putFile(localTmpPath, '/tmp/find_acc.js');
        await ssh.execCommand('docker cp /tmp/find_acc.js icu_server_prod:/app/find_acc.js');
        const result = await ssh.execCommand('docker exec icu_server_prod node find_acc.js');
        console.log(result.stdout);
        ssh.dispose();
    } catch (err) {
        console.error(err);
    }
})();
