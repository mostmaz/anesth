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
        const patients = await prisma.patient.findMany({
            where: { name: { contains: 'هاشم' } },
            include: {
                admissions: {
                    where: { dischargedAt: null }
                }
            }
        });

        console.log('--- HASHIM PATIENTS AND ACTIVE ADMISSIONS ---');
        patients.forEach(p => {
            console.log(\`Patient ID: \${p.id}\`);
            console.log(\`Name: \${p.name}\`);
            console.log(\`MRN: \${p.mrn}\`);
            console.log(\`Active Admissions: \${p.admissions.length}\`);
            p.admissions.forEach(a => {
                console.log(\`  - Admission ID: \${a.id} (Admitted At: \${a.admittedAt})\`);
            });
            console.log('-------------------');
        });
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}
run();
`;

        const localTmpPath = require('path').resolve('tmp_admissions.js');
        require('fs').writeFileSync(localTmpPath, scriptContent);
        await ssh.putFile(localTmpPath, '/tmp/check_admissions.js');
        await ssh.execCommand('docker cp /tmp/check_admissions.js icu_server_prod:/app/check_admissions.js');
        const result = await ssh.execCommand('docker exec icu_server_prod node check_admissions.js');
        console.log(result.stdout);
        ssh.dispose();
    } catch (err) {
        console.error(err);
    }
})();
