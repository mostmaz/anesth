
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

        const name = "حكمت عبدالرزاق عبدالله سليم";
        console.log(`Searching for patient: ${name}`);

        const r = await ssh.execCommand(
            `docker exec icu_server_prod node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); p.patient.findFirst({ where: { name: { contains: 'حكمت' } } }).then(res => console.log(JSON.stringify(res))).finally(() => p.\\$disconnect())"`
        );

        console.log('Result:', r.stdout || r.stderr);

        ssh.dispose();
    } catch (e) {
        console.error("SSH failed:", e.message);
        process.exit(1);
    }
})();
