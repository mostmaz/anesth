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

        const name = "نوري";
        console.log(`Starting remote sync test for patient: ${name}`);

        // Base64 encode the script to avoid SSH string escaping issues
        const scriptContent = `
            const { PrismaClient } = require('@prisma/client');
            const { LabImportService } = require('./dist/services/labImportService');
            const prisma = new PrismaClient();
            
            async function run() {
                try {
                    const patient = await prisma.patient.findFirst({
                        where: { name: { contains: '${name}' } }
                    });
                    
                    if (!patient) {
                        console.log('Patient not found in DB');
                        return;
                    }
                    console.log('Found Patient:', patient.name, patient.mrn);
                    
                    const service = new LabImportService();
                    const results = await service.syncAndSavePatientLabs(patient.mrn, patient.id, 'admin-test', patient.name);
                    
                    console.log('Sync Results:', results.length, 'new reports imported.');
                    results.forEach((r, i) => console.log(' ->', r.investigation.title));
                } catch(e) {
                    console.error('Error:', e.message);
                } finally {
                    await prisma.$disconnect();
                }
            }
            run();
        `;

        const b64 = Buffer.from(scriptContent).toString('base64');

        const remoteCommand = `docker exec icu_server_prod sh -c "echo '${b64}' | base64 -d | node"`;

        const r = await ssh.execCommand(remoteCommand);
        console.log('========== STDOUT ==========');
        console.log(r.stdout);
        if (r.stderr) {
            console.log('========== STDERR ==========');
            console.log(r.stderr);
        }

        ssh.dispose();
    } catch (e) {
        console.error("SSH failed:", e.message);
        process.exit(1);
    }
})();
