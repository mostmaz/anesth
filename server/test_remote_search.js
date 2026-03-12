
const { LabImportService } = require('./dist/services/labImportService');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

async function testSearchAndScreenshot() {
    const service = new LabImportService();
    const browser = await service.launchBrowser();
    const page = await browser.newPage();
    try {
        const username = 'icu@amrlab.net';
        const password = process.env.LAB_PASSWORD || '1989';
        console.log('Logging in...');
        await service.login(page, username, password);

        console.log('Navigating to Invoices...');
        await page.goto('https://amrlab.net/referral/invoices', { waitUntil: 'networkidle2' });

        const searchSelector = 'input[type="search"], .dataTables_filter input';
        await page.waitForSelector(searchSelector, { timeout: 30000 });

        console.log('Typing search query: هاشم ياسين');
        await page.type(searchSelector, 'هاشم ياسين', { delay: 100 });
        console.log('Waiting 15 seconds for table to update...');
        await new Promise(r => setTimeout(r, 15000));

        const screenPath = path.join(process.cwd(), 'uploads', 'search_result.png');
        await page.screenshot({ path: screenPath, fullPage: true });
        console.log(`Screenshot saved to: ${screenPath}`);

        const html = await page.content();
        fs.writeFileSync(path.join(process.cwd(), 'uploads', 'search_result.html'), html);
        console.log('HTML saved to /app/uploads/search_result.html');

    } catch (err) {
        console.error('Search test failed:', err);
    } finally {
        await browser.close();
    }
}

testSearchAndScreenshot();
