
const { LabImportService } = require('./dist/services/labImportService');
require('dotenv').config();

async function inspectSelectors() {
    const service = new LabImportService();
    const browser = await service.launchBrowser();
    const page = await browser.newPage();
    try {
        const username = 'icu@amrlab.net';
        const password = process.env.LAB_PASSWORD || '1989';

        console.log('--- SELECTOR INSPECTION START ---');
        await service.login(page, username, password);

        console.log('Navigating to Invoices...');
        await page.goto('https://amrlab.net/referral/invoices', { waitUntil: 'networkidle2', timeout: 60000 });

        console.log(`Current URL: ${page.url()}`);
        console.log(`Page Title: ${await page.title()}`);

        const inputs = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('input, button, a')).map(el => ({
                tag: el.tagName,
                type: el.getAttribute('type'),
                id: el.id,
                name: el.getAttribute('name'),
                class: el.className,
                text: el.innerText.trim(),
                placeholder: el.getAttribute('placeholder')
            }));
        });

        console.log('Detected Elements:');
        console.log(JSON.stringify(inputs.filter(i => i.type === 'search' || i.text.includes('Search') || i.placeholder?.includes('Search')), null, 2));

        const tableInfo = await page.evaluate(() => {
            const table = document.querySelector('table.dataTable');
            return table ? {
                id: table.id,
                class: table.className,
                rows: table.querySelectorAll('tbody tr').length
            } : 'No dataTable found';
        });
        console.log('Table Info:', tableInfo);

    } catch (err) {
        console.error('Inspection failed:', err);
    } finally {
        await browser.close();
    }
}

inspectSelectors().catch(console.error);
