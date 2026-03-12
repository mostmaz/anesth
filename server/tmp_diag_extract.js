
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
