
const { LabImportService } = require('./dist/services/labImportService');
const service = new LabImportService();

async function run() {
    const browser = await service.launchBrowser();
    const page = await browser.newPage();
    try {
        await service.login(page, 'icu@amrlab.net', '1989');
        
        console.log('--- DIAGNOSTIC START ---');
        console.log('Target Name:', "هاشم ياسين خليل يونس");
        
        // Search for first two tokens
        await page.waitForSelector('input[type="search"]');
        await page.type('input[type="search"]', 'هاشم ياسين');
        console.log('Waiting for table to update...');
        await new Promise(r => setTimeout(r, 10000));

        const reports = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('table.dataTable > tbody > tr'));
            return rows.map(r => {
                const cells = Array.from(r.querySelectorAll('td'));
                if (cells.length < 5) return { type: 'invalid_row', text: r.innerText.trim() };
                const name = cells[3].querySelector('.card-title')?.textContent?.trim() || cells[3].innerText.trim();
                return { type: 'valid_row', name: name };
            });
        });

        console.log('Found Raw Portal Names:', JSON.stringify(reports, null, 2));

        // Test normalization and matching for each found name
        reports.forEach(r => {
            if (r.type === 'valid_row') {
                const isMatch = service.isNameMatch("هاشم ياسين خليل يونس", r.name);
                console.log(`Testing Match: "${r.name}" -> ${isMatch ? 'MATCH' : 'NO MATCH'}`);
            }
        });

    } catch (e) { console.error(e); }
    finally { await browser.close(); }
}
run();
