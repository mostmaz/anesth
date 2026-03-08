const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
(async () => {
    try {
        await ssh.connect({ host: '161.35.216.33', username: 'root', password: '150893412C@c' });

        console.log('Checking investigations for patient: 38b62b34-4f1f-496f-974c-fb8fc34d934b');
        let r = await ssh.execCommand('docker exec icu_server_prod npx prisma investigation findMany --where \'{"patientId": "38b62b34-4f1f-496f-974c-fb8fc34d934b"}\'');

        // Wait, prisma CLI doesn't support findMany like that. I should use a node script.
        const dbCheckScript = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
    const invs = await prisma.investigation.findMany({
        where: { patientId: '38b62b34-4f1f-496f-974c-fb8fc34d934b' },
        orderBy: { createdAt: 'desc' },
        take: 5
    });
    console.log(JSON.stringify(invs, null, 2));
    process.exit(0);
})();
        `;

        r = await ssh.execCommand('docker exec icu_server_prod node -e "' + dbCheckScript.replace(/"/g, '\\"').replace(/\n/g, '') + '"');
        console.log('Investigations:', r.stdout || r.stderr);

        ssh.dispose();
    } catch (e) {
        console.error(e);
    }
})();
