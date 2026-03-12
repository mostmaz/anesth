import dotenv from 'dotenv';
dotenv.config();
import puppeteer from 'puppeteer';

async function run() {
    const username = '10427';
    const password = process.env.LAB_PASSWORD || '7358782';
    const searchQuery = 'نوري';

    console.log("Launching browser for debugging...");
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    try {
        console.log("Logging in...");
        await page.goto('https://amrlab.net/login', { waitUntil: 'networkidle2' });
        await page.type('#email', username);
        await page.type('#password', password);
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
            page.click('button[type="submit"]')
        ]);

        console.log("Logged in. Emitting search string...");
        await page.evaluate((val: string) => {
            const el = document.querySelector('input[type="search"]') as HTMLInputElement;
            if (el) {
                el.value = val;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }, searchQuery);

        console.log("Waiting 5 seconds for results...");
        await new Promise(r => setTimeout(r, 5000));

        const html = await page.content();

        const fs = require('fs');
        fs.writeFileSync('portal_debug.html', html);
        console.log("Saved raw HTML to portal_debug.html");

        const rows = await page.evaluate(() => {
            const trs = document.querySelectorAll('table.dataTable tbody tr');
            return Array.from(trs).map((t: any) => t.innerText.replace(/\n/g, ' '));
        });

        console.log(`Found ${rows.length} rows.`);
        rows.forEach((r, i) => console.log(`Row ${i + 1}:`, r.substring(0, 100)));

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await browser.close();
    }
}

run();
