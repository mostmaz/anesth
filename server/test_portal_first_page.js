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

        console.log(`Starting remote script to dump first page of portal...`);

        const scriptContent = `
            const { LabImportService } = require('./dist/services/labImportService');
            
            async function run() {
                const username = '10427';
                const password = process.env.LAB_PASSWORD || '7358782';
                const service = new LabImportService();
                
                try {
                    console.log('Fetching first page of patients from portal...');
                    const reports = await service.getPatients(username, password, true, undefined, '');
                    
                    console.log('Total Reports on First Page:', reports.length);
                    reports.slice(0, 20).forEach((r, i) => {
                        console.log((i+1) + '. Date:', r.date, '| Name:', r.name, '| Title:', r.title, '| Status:', r.status);
                    });
                } catch(e) {
                    console.error('Error:', e.message);
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
