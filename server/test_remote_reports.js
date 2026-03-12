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
        console.log(`Starting broad remote scraper debug for: ${name}`);

        const scriptContent = `
            const { LabImportService } = require('./dist/services/labImportService');
            
            async function run() {
                try {
                    const username = 'icu@amrlab.net';
                    const password = process.env.LAB_PASSWORD || '1989';
                    const service = new LabImportService();
                    
                    console.log('Fetching patients from portal matching: ${name}');
                    const reports = await service.getPatients(username, password, true, undefined, '${name}');
                    
                    console.log('Total Reports Found:', reports.length);
                    reports.forEach((r, i) => {
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
