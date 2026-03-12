const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function debugYathrib() {
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

        const data = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('table.dataTable > tbody > tr'));
            const results = [];

            for (let i = 0; i < rows.length; i++) {
                const rowOuterHtml = rows[i].outerHTML;
                const innerText = rows[i].innerText;

                if (innerText.includes('يثرب')) {
                    results.push({
                        text: innerText,
                        html: rowOuterHtml
                    });
                }
            }
            return results;
        });

        console.log("Extraction complete.");
        console.log(JSON.stringify(data, null, 2));

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await browser.close();
    }
}

debugYathrib();
