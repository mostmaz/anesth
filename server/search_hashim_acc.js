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

        const accNo = '226031122';
        const scriptContent = `
            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient();
            async function run() {
                const invs = await prisma.investigation.findMany({
                    where: { externalId: '${accNo}' },
                    include: { patient: true }
                });
                console.log('Total Matching Invs: ' + invs.length);
                invs.forEach(i => {
                    console.log('- [' + i.id + '] Patient: ' + i.patient.name + ' (' + i.patient.id + ') | Title: ' + i.title + ' | Date: ' + i.conductedAt.toISOString());
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
