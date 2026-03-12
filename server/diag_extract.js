
const { NodeSSH } = require('node-ssh');

(async () => {
    const ssh = new NodeSSH();
    try {
        await ssh.connect({ host: '161.35.216.33', username: 'root', password: '150893412C@c' });

        const script = `
const { LabImportService } = require('./dist/services/labImportService');
const service = new LabImportService();

async function run() {
    const browser = await service.launchBrowser();
    const page = await browser.newPage();
    try {
        await service.login(page, 'icu@amrlab.net', process.env.LAB_PASSWORD || '1989');
        
        console.log('Searching for "هاشم ياسين"...');
        await page.waitForSelector('input[type="search"]');
        await page.type('input[type="search"]', 'هاشم ياسين');
        await new Promise(r => setTimeout(r, 8000));

        // Captured the DOM structure specifically for the Extraction Logic
        const debugInfo = await page.evaluate(() => {
            const container = document.querySelector('table.dataTable tbody');
            if (!container) return 'NO TBODY FOUND';
            const rows = Array.from(container.querySelectorAll('tr'));
            return rows.map(row => {
                const cells = Array.from(row.querySelectorAll('td'));
                return {
                    isRow: row.tagName,
                    classList: row.className,
                    cellCount: cells.length,
                    html: row.innerHTML.substring(0, 300)
                };
            });
        });
        console.log('DEBUG DOM ROWS:', JSON.stringify(debugInfo, null, 2));

        // Test the direct extraction logic from the service
        const portalReports = await service.getPortalReports('icu@amrlab.net', '1989', 'هاشم ياسين خليل يونس', browser);
        console.log('getPortalReports results:', JSON.stringify(portalReports, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
}
run();
`;
        const localPath = 'c:/Users/Administrator/Documents/d/ICU-Manager/server/tmp_diag_extract.js';
        require('fs').writeFileSync(localPath, script);
        await ssh.putFile(localPath, '/tmp/diag_extract.js');
        await ssh.execCommand('docker cp /tmp/diag_extract.js icu_server_prod:/app/diag_extract.js');
        const res = await ssh.execCommand('docker exec icu_server_prod node diag_extract.js');
        console.log(res.stdout);
        console.log(res.stderr);
        ssh.dispose();
    } catch (e) { console.error(e); }
})();
