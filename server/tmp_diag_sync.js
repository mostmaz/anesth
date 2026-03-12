
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
