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

        // This script will:
        // 1. Log in to the portal
        // 2. Fetch the patient list for Hashim Yasin
        // 3. For each report, check the status text/class
        // 4. For one successful report, attempt to fetch the PDF and log the Content-Disposition header
        const scriptContent = `
const { LabImportService } = require('./dist/services/labImportService');
const service = new LabImportService();
const username = 'icu@amrlab.net';
const password = process.env.LAB_PASSWORD || '1989';

async function run() {
    try {
        console.log('--- RESEARCHING PORTAL DATA ---');
        const browser = await service.launchBrowser();
        const page = await browser.newPage();
        
        await service.login(page, username, password);
        
        const allReports = await service.getPatients(username, password, true, browser, 'هاشم ياسين خليل يونس');
        
        console.log(\`Found \${allReports.length} report lines for Hashim.\`);
        
        // Inspect one report row in the DOM to see status indicators
        const statusDetails = await page.evaluate(() => {
            const row = document.querySelector('table.dataTable tbody tr[role="row"]');
            if (!row) return 'No row found';
            
            const cells = Array.from(row.querySelectorAll('td'));
            const invCell = cells[4];
            if (!invCell) return 'No inv cell';
            
            const statuses = Array.from(invCell.querySelectorAll('td.text-success, td.text-danger, td.text-warning')).map(td => ({
                text: td.innerText.trim(),
                className: td.className
            }));
            
            return {
                html: invCell.innerHTML.substring(0, 500),
                statuses
            };
        });
        
        console.log('DOM Status Details:', JSON.stringify(statusDetails, null, 2));

        // Now, try to get the PDF filename from headers for the first report
        if (allReports.length > 0) {
            const report = allReports[0];
            const printUrl = \`https://amrlab.net/referral/invoices/print_medical_report/\${report.invoiceId}\`;
            console.log(\`Checking PDF headers for: \${printUrl}\`);
            
            const headerInfo = await page.evaluate(async (url) => {
                const tokenInput = document.querySelector('input[name="_token"]');
                const token = tokenInput ? tokenInput.value : '';
                
                try {
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: \`_token=\${encodeURIComponent(token)}\`
                    });
                    
                    return {
                        status: response.status,
                        contentType: response.headers.get('content-type'),
                        contentDisposition: response.headers.get('content-disposition'),
                        url: response.url
                    };
                } catch (e) { return { error: e.message }; }
            }, printUrl);
            
            console.log('PDF Header Info:', JSON.stringify(headerInfo, null, 2));
        }

        await browser.close();
    } catch (err) {
        console.error(err);
    }
}
run();
`;

        const localTmpPath = require('path').resolve('tmp_research.js');
        require('fs').writeFileSync(localTmpPath, scriptContent);
        await ssh.putFile(localTmpPath, '/tmp/research_portal.js');
        await ssh.execCommand('docker cp /tmp/research_portal.js icu_server_prod:/app/research_portal.js');
        const result = await ssh.execCommand('docker exec icu_server_prod node research_portal.js');
        console.log(result.stdout);
        ssh.dispose();
    } catch (err) {
        console.error(err);
    }
})();
