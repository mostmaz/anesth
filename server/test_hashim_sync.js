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

        const name = "هاشم";
        console.log(`Starting remote sync test for patient query: ${name}`);

        const scriptContent = `
            const { PrismaClient } = require('@prisma/client');
            const { LabImportService } = require('./dist/services/labImportService');
            const prisma = new PrismaClient();
            
            async function run() {
                try {
                    // Find ALL patients matching the name to see if we have duplicates
                    const patients = await prisma.patient.findMany({
                        where: { name: { contains: '${name}' } }
                    });
                    
                    console.log('Patients Found in DB:', patients.length);
                    for (const patient of patients) {
                        console.log('--- Checking Patient:', patient.name, 'ID:', patient.id, 'MRN:', patient.mrn, 'Admitted:', patient.isAdmitted);
                        
                        const service = new LabImportService();
                        // We use the first one for now, or the one that is admitted
                        const results = await service.syncAndSavePatientLabs(patient.mrn, patient.id, 'admin-test', patient.name);
                        
                        console.log('Sync Results for ' + patient.name + ':', results.length, 'new reports imported.');
                    }
                } catch(e) {
                    console.error('Error:', e.message);
                    console.error(e.stack);
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
