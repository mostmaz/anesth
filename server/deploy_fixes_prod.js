
const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');

(async () => {
    const ssh = new NodeSSH();
    try {
        await ssh.connect({
            host: '161.35.216.33',
            username: 'root',
            password: '150893412C@c',
            readyTimeout: 30000
        });

        console.log('Deploying schema and code to production...');

        // 1. Push schema.prisma
        const localSchemaPath = 'c:/Users/Administrator/Documents/d/ICU-Manager/server/prisma/schema.prisma';
        await ssh.putFile(localSchemaPath, '/tmp/schema.prisma');
        await ssh.execCommand('docker cp /tmp/schema.prisma icu_server_prod:/app/prisma/schema.prisma');

        // 2. Push prisma generate and db push
        console.log('Updating production database schema...');
        const pushResult = await ssh.execCommand('docker exec icu_server_prod npx prisma db push --skip-generate');
        console.log('DB Push Output:', pushResult.stdout || pushResult.stderr);

        const genResult = await ssh.execCommand('docker exec icu_server_prod npx prisma generate');
        console.log('Prisma Generate Output:', genResult.stdout || genResult.stderr);

        // 3. Push code changes
        const filesToPush = [
            { local: 'c:/Users/Administrator/Documents/d/ICU-Manager/server/src/routes/lab.routes.ts', remote: '/app/src/routes/lab.routes.ts' },
            { local: 'c:/Users/Administrator/Documents/d/ICU-Manager/server/src/services/labImportService.ts', remote: '/app/src/services/labImportService.ts' },
            { local: 'c:/Users/Administrator/Documents/d/ICU-Manager/server/src/services/ocrService.ts', remote: '/app/src/services/ocrService.ts' },
            { local: 'c:/Users/Administrator/Documents/d/ICU-Manager/server/src/routes/skin.routes.ts', remote: '/app/src/routes/skin.routes.ts' },
            { local: 'c:/Users/Administrator/Documents/d/ICU-Manager/server/src/routes/index.ts', remote: '/app/src/routes/index.ts' },
            // Compiled JS files
            { local: 'c:/Users/Administrator/Documents/d/ICU-Manager/server/dist/routes/lab.routes.js', remote: '/app/dist/routes/lab.routes.js' },
            { local: 'c:/Users/Administrator/Documents/d/ICU-Manager/server/dist/services/labImportService.js', remote: '/app/dist/services/labImportService.js' },
            { local: 'c:/Users/Administrator/Documents/d/ICU-Manager/server/dist/services/ocrService.js', remote: '/app/dist/services/ocrService.js' },
            { local: 'c:/Users/Administrator/Documents/d/ICU-Manager/server/dist/routes/skin.routes.js', remote: '/app/dist/routes/skin.routes.js' },
            { local: 'c:/Users/Administrator/Documents/d/ICU-Manager/server/dist/routes/index.js', remote: '/app/dist/routes/index.js' }
        ];

        for (const file of filesToPush) {
            const tmpPath = `/tmp/${path.basename(file.local)}`;
            await ssh.putFile(file.local, tmpPath);
            await ssh.execCommand(`docker cp ${tmpPath} icu_server_prod:${file.remote}`);
            console.log(`Pushed ${path.basename(file.local)}`);
        }

        console.log('Restarting production container...');
        await ssh.execCommand('docker restart icu_server_prod');

        console.log('Deployment complete.');
        ssh.dispose();
    } catch (e) {
        console.error("Deployment failed:", e.message);
        process.exit(1);
    }
})();
