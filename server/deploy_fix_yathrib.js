const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');

const ssh = new NodeSSH();

async function deployAndFix() {
    try {
        console.log("Connecting to production server...");
        await ssh.connect({
            host: '161.35.216.33',
            username: 'root',
            password: '150893412C@c',
            readyTimeout: 30000
        });

        console.log("Connected.");

        // 1. Upload the fixed labImportService.ts
        const localFile = path.join(__dirname, 'src', 'services', 'labImportService.ts');
        const remoteFile = '/root/icu/ICU-Manager/server/src/services/labImportService.ts';
        console.log("Uploading patched labImportService.ts...");
        await ssh.putFile(localFile, remoteFile);
        console.log("Upload complete.");

        // 2. Recompile and restart the Docker container
        console.log("Rebuilding and restarting backend container...");
        const buildCmd = `cd /root/icu/ICU-Manager/server && docker exec icu_server_prod sh -c "npm run build" && docker restart icu_server_prod`;
        const buildResult = await ssh.execCommand(buildCmd);
        console.log(buildResult.stdout);
        if (buildResult.stderr) console.error("STDERR:", buildResult.stderr);
        console.log("Restart complete. Waiting 5 seconds for server to start...");
        await new Promise(r => setTimeout(r, 5000));

        // 3. Write and execute the Prisma cleanup script inside Docker
        console.log("Wiping corrupt records for Yathrib and triggering a fresh sync...");
        const scriptContent = `
            const { PrismaClient } = require('@prisma/client');
            const { LabImportService } = require('./dist/services/labImportService');
            const prisma = new PrismaClient();

            async function run() {
                const patient = await prisma.patient.findFirst({
                    where: { name: { contains: 'يثرب' } }
                });
                
                if (!patient) {
                    console.log('Target patient not found.');
                    return;
                }
                console.log('Found Patient: ' + patient.name);

                const count = await prisma.investigation.deleteMany({
                    where: { patientId: patient.id, type: 'LAB' }
                });
                console.log('Deleted ' + count.count + ' corrupt records.');

                const scraper = new LabImportService();
                console.log('Syncing...');
                const results = await scraper.syncAndSavePatientLabs(patient.mrn, patient.id, 'system', patient.name);
                console.log('Imported ' + results.length + ' tests successfully.');
                results.forEach(r => console.log(' - ' + r.title + ' [' + r.status + ']'));
            }
            run().catch(console.error).finally(() => prisma.$disconnect());
        `;

        const b64 = Buffer.from(scriptContent).toString('base64');
        const remoteCommand = `docker exec icu_server_prod sh -c "echo '${b64}' | base64 -d | node"`;
        const fixResult = await ssh.execCommand(remoteCommand);

        console.log('========== FIX SCRIPT OUTPUT ==========');
        console.log(fixResult.stdout);
        if (fixResult.stderr) console.error(fixResult.stderr);

    } catch (e) {
        console.error("Deployment failed:", e);
    } finally {
        ssh.dispose();
    }
}

deployAndFix();
