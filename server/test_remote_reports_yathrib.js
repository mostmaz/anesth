const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function debugYathrib() {
    console.log("Launching browser...");
    const browser = await puppeteer.launch({
        executablePath: fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' :
            fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe') ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' :
                undefined,
        headless: true,
        defaultViewport: { width: 1920, height: 1080 },
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
    });

    try {
        const page = await browser.newPage();

        await page.goto('https://amrlab.net/referral/auth/login', { waitUntil: 'networkidle2', timeout: 60000 });

        const usernameSelector = 'input[name="identity"], input[name="email"]';
        try {
            await page.waitForSelector(usernameSelector, { timeout: 10000 });
            await page.type(usernameSelector, 'icu@amrlab.net');
            await page.type('input[name="password"]', '1989');
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle2' }),
                page.click('button[type="submit"]')
            ]);
            console.log("Login successful");
        } catch (e) { }

        await page.goto('https://amrlab.net/referral/invoices', { waitUntil: 'networkidle2', timeout: 60000 });

        if (page.url().includes('login')) {
            await page.type(usernameSelector, 'icu@amrlab.net');
            await page.type('input[name="password"]', '1989');
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle2' }),
                page.click('button[type="submit"]')
            ]);
            await page.goto('https://amrlab.net/referral/invoices', { waitUntil: 'networkidle2', timeout: 60000 });
        }

        console.log("Searching for يثرب...");
        try {
            await page.waitForSelector('.dataTables_filter input, input[type="search"]', { timeout: 10000 });
            await page.type('.dataTables_filter input, input[type="search"]', 'يثرب');
            await page.waitForTimeout(3000);
        } catch (e) { }

        await page.screenshot({ path: 'yathrib_debug.png' });

        const data = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('table.dataTable > tbody > tr'));
            const results = [];

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const cells = Array.from(row.querySelectorAll('td'));
                if (cells.length < 5) continue;

                const name = cells[3].innerText.trim();
                if (!name.includes('يثرب')) continue;

                // Let's find the cell that contains tests. Usually has `table` inside.
                let invCell = null;
                for (let c = 0; c < cells.length; c++) {
                    if (cells[c].querySelector('table')) {
                        invCell = cells[c];
                        break;
                    }
                }

                if (!invCell) {
                    results.push({ name, error: "No nested table found in any cell", rowHtml: row.innerHTML });
                    continue;
                }

                const testRows = Array.from(invCell.querySelectorAll('table tr'));

                const tests = testRows.map(tr => {
                    const statusTd = tr.querySelector('td.text-success, td.text-danger, td.text-warning, td.text-info');
                    const allTds = Array.from(tr.querySelectorAll('td'));
                    const tdsText = allTds.map(td => td.innerText).join(' | ');

                    return {
                        statusTdHtml: statusTd ? statusTd.outerHTML : 'null',
                        tdsText: tdsText,
                    };
                });

                results.push({ name, numTests: testRows.length, tests });
            }
            return results;
        });

        console.log(JSON.stringify(data, null, 2));

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await browser.close();
    }
}

debugYathrib();
