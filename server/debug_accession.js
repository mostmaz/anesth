
const puppeteer = require('puppeteer');
const path = require('path');

const BASE_URL = 'https://www.labforme.com/Login/';
const USERNAME = '10427';
const PASSWORD = process.env.LAB_PASSWORD || '7358782';
const TARGET_ACC = '3119390';

async function run() {
    let browser;
    try {
        const fs = require('fs');
        let executablePath = '';
        const possiblePaths = [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
        ];

        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                executablePath = p;
                break;
            }
        }
        console.log('Using executable:', executablePath || 'bundled');

        console.log('Launching browser...');
        browser = await puppeteer.launch({
            headless: true,
            executablePath: executablePath || undefined,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
        });
        const page = await browser.newPage();

        console.log('Navigating to ' + BASE_URL);
        await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 60000 });

        // Login
        console.log('Waiting for login selector...');
        await page.waitForSelector('img[src*="3.svg"]', { timeout: 10000 }).catch(e => console.log("Blue button not found, maybe already on login form?"));

        try {
            await page.click('img[src*="3.svg"]');
        } catch (e) { }

        await page.waitForSelector('input[name="userName"]', { timeout: 30000 });

        // Robust Login
        console.log('Dispatching credentials via JS...');
        await page.evaluate((u, p) => {
            const user = document.querySelector('input[name="userName"]');
            const pass = document.querySelector('input[name="passWord"]');

            if (user) {
                user.value = u;
                user.dispatchEvent(new Event('input', { bubbles: true }));
                user.dispatchEvent(new Event('change', { bubbles: true }));
                user.dispatchEvent(new Event('blur', { bubbles: true }));
            }
            if (pass) {
                pass.value = p;
                pass.dispatchEvent(new Event('input', { bubbles: true }));
                pass.dispatchEvent(new Event('change', { bubbles: true }));
                pass.dispatchEvent(new Event('blur', { bubbles: true }));
            }
        }, USERNAME, PASSWORD);

        console.log('Clicking Login/Pressing Enter...');
        try {
            await page.focus('input[name="passWord"]');
            await page.keyboard.press('Enter');
            await new Promise(r => setTimeout(r, 1000));
            await page.evaluate(() => {
                const btn = document.querySelector('button.btn-primary');
                if (btn) btn.click();
            });
        } catch (e) { }

        console.log('Waiting for navigation...');
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 });

        console.log('Logged in. Waiting for table...');
        await page.waitForSelector('table.k-grid-table', { timeout: 30000 });

        // Scrape Rows
        const rows = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('table.k-grid-table tbody tr')).map((tr, idx) => {
                const cells = Array.from(tr.querySelectorAll('td'));
                if (cells.length < 7) return null;
                const titleLong = cells[6] ? cells[6].innerText.trim() : '';
                const title = titleLong ? titleLong.split('/')[0].trim() : 'Unknown Test';
                const accNo = cells[0] ? cells[0].innerText.trim() : '';

                return {
                    rowIndex: idx,
                    accNo: accNo,
                    date: cells[1] ? cells[1].innerText.trim() : '',
                    mrn: cells[2] ? cells[2].innerText.trim() : '',
                    name: cells[3] ? cells[3].innerText.trim() : '',
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

        if (targetRows.length > 0) {
            const name = targetRows[0].name;
            const sameName = rows.filter(r => r.name === name && r.accNo !== TARGET_ACC);
            if (sameName.length > 0) {
                console.log(`\nOther rows for patient ${name}:`);
                sameName.forEach(r => {
                    console.log(`[Row ${r.rowIndex}] Acc: ${r.accNo}, Test: ${r.title} (Full: ${r.fullTitle})`);
                });
            }
        } else {
            console.log("No rows found for this AccNo. Dumping first 5 rows to verify structure:");
            rows.slice(0, 5).forEach(r => console.log(r));
        }

    } catch (e) {
        console.error("Error:", e);
    } finally {
        if (browser) await browser.close();
    }
}

run();
