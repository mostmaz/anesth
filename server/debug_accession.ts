
import puppeteer from 'puppeteer';

const BASE_URL = 'https://www.labforme.com/Login/';
const USERNAME = '10427';
const PASSWORD = process.env.LAB_PASSWORD || '7358782';
const TARGET_ACC = '3119390';

async function run() {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        console.log('Navigating to ' + BASE_URL);
        await page.goto(BASE_URL, { waitUntil: 'networkidle2' });

        // Login
        await page.waitForSelector('img[src*="3.svg"]');
        await page.click('img[src*="3.svg"]');
        await page.waitForSelector('input[name="userName"]');

        await page.type('input[name="userName"]', USERNAME);
        await page.type('input[name="passWord"]', PASSWORD);
        await page.keyboard.press('Enter');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });

        console.log('Logged in. Waiting for table...');
        await page.waitForSelector('table.k-grid-table', { timeout: 30000 });

        // Scrape Rows
        const rows = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('table.k-grid-table tbody tr')).map((tr, idx) => {
                const cells = Array.from(tr.querySelectorAll('td'));
                if (cells.length < 7) return null;
                const titleLong = (cells[6] as HTMLElement)?.innerText?.trim();
                const title = titleLong ? titleLong.split('/')[0].trim() : 'Unknown Test';
                const accNo = (cells[0] as HTMLElement)?.innerText?.trim();

                return {
                    rowIndex: idx,
                    accNo: accNo,
                    date: (cells[1] as HTMLElement)?.innerText?.trim(),
                    mrn: (cells[2] as HTMLElement)?.innerText?.trim(),
                    name: (cells[3] as HTMLElement)?.innerText?.trim(),
                    title: title,
                    fullTitle: titleLong
                };
            }).filter(r => r !== null);
        });

        console.log(`Scraped ${rows.length} total rows.`);

        const targetRows = rows.filter(r => r.accNo === TARGET_ACC);
        console.log(`Found ${targetRows.length} rows for AccNo ${TARGET_ACC}:`);
        targetRows.forEach(r => {
            console.log(`[Row ${r.rowIndex}] MRN: ${r.mrn}, Name: ${r.name}, Test: ${r.title} (Full: ${r.fullTitle})`);
        });

        // Check if there are other rows with same name but different AccNo (maybe close?)
        if (targetRows.length > 0) {
            const name = targetRows[0].name;
            const sameName = rows.filter(r => r.name === name && r.accNo !== TARGET_ACC);
            if (sameName.length > 0) {
                console.log(`\nOther rows for patient ${name}:`);
                sameName.forEach(r => {
                    console.log(`[Row ${r.rowIndex}] Acc: ${r.accNo}, Test: ${r.title}`);
                });
            }
        }

    } catch (e) {
        console.error(e);
        await page.screenshot({ path: 'debug_error.png' });
    } finally {
        await browser.close();
    }
}

run();
