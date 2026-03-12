
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
        
        // Search for just "هاشم" (shorter)
        console.log('Searching for "هاشم"...');
        await page.waitForSelector('input[type="search"]');
        await page.type('input[type="search"]', 'هاشم');
        await new Promise(r => setTimeout(r, 8000));

        const rowCount = await page.evaluate(() => document.querySelectorAll('table.dataTable tbody tr').length);
        console.log('Visible rows for "هاشم":', rowCount);

        const rowData = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('table.dataTable tbody tr')).map(row => {
                const cells = Array.from(row.querySelectorAll('td'));
                return cells.map(c => c.innerText.trim()).join(' | ');
            });
        });
        console.log('Row Data:', JSON.stringify(rowData, null, 2));

        // Now check the new getPatients call with the full name
        console.log('--- Calling getPatients("هاشم ياسين خليل يونس") ---');
        const results = await service.getPatients('icu@amrlab.net', '1989', true, browser, 'هاشم ياسين خليل يونس');
        console.log('getPatients returned:', results.length, 'records');
        if (results.length > 0) console.log('Sample Result:', JSON.stringify(results[0], null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
}
run();
`;
        const localPath = 'c:/Users/Administrator/Documents/d/ICU-Manager/server/tmp_diag_sync.js';
        require('fs').writeFileSync(localPath, script);
        await ssh.putFile(localPath, '/tmp/diag_sync.js');
        await ssh.execCommand('docker cp /tmp/diag_sync.js icu_server_prod:/app/diag_sync.js');
        const res = await ssh.execCommand('docker exec icu_server_prod node diag_sync.js');
        console.log(res.stdout);
        console.log(res.stderr);
        ssh.dispose();
    } catch (e) { console.error(e); }
})();
