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
                const patients = await prisma.patient.findMany({
                    where: { name: { contains: 'نوري' } }
                });
                console.log('Patients Found: ' + patients.length);
                for (const p of patients) {
                    const invs = await prisma.investigation.findMany({
                        where: { patientId: p.id },
                        orderBy: { conductedAt: 'desc' }
                    });
                    console.log('--- Investigations for ' + p.id + ' (' + p.name + ') ---');
                    invs.forEach(i => {
                        console.log('ID: ' + i.id + ' | Title: ' + i.title + ' | Date: ' + i.conductedAt.toISOString() + ' | ExtID: ' + i.externalId);
                    });
                }
                
                const byExt = await prisma.investigation.findMany({
                    where: { externalId: { startsWith: '22603' } },
                    include: { patient: true }
                });
                console.log('--- Investigations by AccNo 22603... ---');
                byExt.forEach(i => {
                    console.log('ID: ' + i.id + ' | Title: ' + i.title + ' | Date: ' + i.conductedAt.toISOString() + ' | AccNo: ' + i.externalId + ' | Patient: ' + i.patient.name);
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
