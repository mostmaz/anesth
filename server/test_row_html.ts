import { LabImportService } from './src/services/labImportService';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    const svc = new LabImportService();
    try {
        const username = '10427';
        const password = process.env.LAB_PASSWORD || '7358782';

        const browser = await (svc as any).launchBrowser();
        const page = await browser.newPage();
        await (svc as any).login(page, username, password);

        await page.waitForSelector('table.k-grid-table', { timeout: 30000 });

        const html = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('table.k-grid-table tbody tr'));
            const targetRow = rows.find(tr => (tr as HTMLElement).innerText.includes('3120378'));
            return targetRow ? targetRow.outerHTML : 'Row not found';
        });

        console.log("HTML for row 3120378:");
        console.log(html);

        await browser.close();
    } catch (e) {
        console.error(e);
    }
}
run();
