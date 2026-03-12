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

        const name = "هاشم ياسين خليل";
        console.log(`Starting remote debug for Hashim Yasin: "${name}"`);

        // We'll write the script to a temporary file, push it to /tmp, 
        // then docker cp it into the container and run it there.
        // This avoids all the complex shell escaping issues.

        const scriptContent = `
const { LabImportService } = require('./dist/services/labImportService');
const service = new LabImportService();
const username = 'icu@amrlab.net';
const password = process.env.LAB_PASSWORD || '1989';

async function run() {
    try {
        console.log('--- Fetching all reports matching "هاشم" ---');
        // We use true for forceRefresh and provide null for browserInstance (it will launch its own)
        const allReports = await service.getPatients(username, password, true, null, 'هاشم');
        
        console.log('Portal View - All results for search "هاشم":');
        allReports.forEach(r => {
            console.log(\`  - [\${r.accNo}] Date: \${r.date} Name: \${r.name} Title: \${r.title}\`);
        });

        const targetName = "هاشم ياسين خليل يونس";
        const normalize = (s) => {
            if (!s) return '';
            return s
                .replace(/\\s+/g, ' ')
                .trim()
                .toLowerCase()
                .replace(/[أإآ]/g, 'ا')
                .replace(/ة/g, 'ه')
                .replace(/[ىي]/g, 'ي')
                .replace(/ئ/g, 'ي')
                .replace(/ؤ/g, 'و')
                .replace(/عبد\\s+/g, 'عبد')
                .replace(/ابو\\s+/g, 'ابو')
                .replace(/ابا\\s+/g, 'ابا')
                .replace(/ابي\\s+/g, 'ابي')
                .replace(/حمه/g, 'حما');
        };

        const targetNorm = normalize(targetName);
        console.log(\`\\nTarget Normalized: "\${targetNorm}"\`);

        const isNameMatch = (target, row) => {
            if (!target || !row) return false;
            if (row === target || row.includes(target) || target.includes(row)) return true;
            const targetTokens = target.split(/\\s+/).filter(t => t.length > 1);
            const rowTokens = row.split(/\\s+/).filter(t => t.length > 1);
            if (targetTokens.length === 0 || rowTokens.length === 0) return false;
            const isRowSubset = rowTokens.every(t => targetTokens.includes(t));
            const isTargetSubset = targetTokens.every(t => rowTokens.includes(t));
            if (isRowSubset || isTargetSubset) {
                const minTokens = Math.min(targetTokens.length, rowTokens.length);
                if (minTokens >= 2) return true;
            }
            return false;
        };

        const matched = allReports.filter(r => {
            const rowNorm = normalize(r.name);
            const match = isNameMatch(targetNorm, rowNorm);
            if (match) {
                console.log(\`  MATCH: "\${r.name}" (Normalized: "\${rowNorm}")\`);
            }
            return match;
        });

        console.log(\`\\nFinal filtered reports for Hashim: \${matched.length}\`);
    } catch (err) {
        console.error('Error during scrape:', err);
    }
}

run();
`;

        const localTmpPath = require('path').resolve('tmp_debug.js');
        require('fs').writeFileSync(localTmpPath, scriptContent);

        await ssh.putFile(localTmpPath, '/tmp/debug_hashim.js');
        await ssh.execCommand('docker cp /tmp/debug_hashim.js icu_server_prod:/app/debug_hashim.js');

        const result = await ssh.execCommand('docker exec icu_server_prod node debug_hashim.js');
        console.log('STDOUT:', result.stdout);
        console.log('STDERR:', result.stderr);

        // Cleanup
        await ssh.execCommand('rm /tmp/debug_hashim.js');
        await ssh.execCommand('docker exec icu_server_prod rm /app/debug_hashim.js');
        require('fs').unlinkSync(localTmpPath);

    } catch (err) {
        console.error('Connection error:', err);
    } finally {
        ssh.dispose();
    }
})();
