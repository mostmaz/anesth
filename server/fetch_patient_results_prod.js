
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

        const patientId = "38b62b34-4f1f-496f-974c-fb8fc34d934b";
        console.log(`Fetching investigations for patient ID: ${patientId}`);

        const r = await ssh.execCommand(
            `docker exec icu_server_prod node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); p.investigation.findMany({ where: { patientId: '${patientId}' }, orderBy: { conductedAt: 'desc' }, take: 5 }).then(res => console.log(JSON.stringify(res))).finally(() => p.\\$disconnect())"`
        );

        console.log('Result:', r.stdout || r.stderr);

        ssh.dispose();
    } catch (e) {
        console.error("SSH failed:", e.message);
        process.exit(1);
    }
})();
