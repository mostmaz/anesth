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
                const invs = await prisma.investigation.findMany({
                    where: { externalId: { startsWith: '226031' } },
                    include: { patient: true }
                });
                console.log('Total Matching Invs: ' + invs.length);
                invs.forEach(i => {
                    console.log('ID: ' + i.id + ' | AccNo: ' + i.externalId + ' | Patient: ' + i.patient.name + ' | Date: ' + i.conductedAt.toISOString());
                });
            }
            run().finally(() => prisma.$disconnect());
        `;

        const b64 = Buffer.from(scriptContent).toString('base64');
        const remoteCommand = `docker exec icu_server_prod sh -c "echo '${b64}' | base64 -d | node"`;

        const r = await ssh.execCommand(remoteCommand);
        console.log('========== STDOUT ==========');
        console.log(r.stdout);

        ssh.dispose();
    } catch (e) {
        console.error("SSH failed:", e.message);
        process.exit(1);
    }
})();
