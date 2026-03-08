const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    try {
        console.log('Navigating to login...');
        await page.goto('https://amrlab.net/laboratory/auth/login', { waitUntil: 'networkidle2' });
        await page.screenshot({ path: path.join(__dirname, 'amrlab_login.png') });

        console.log('Entering credentials...');
        await page.type('input[type="email"]', 'icu@amrlab.net');
        await page.type('input[type="password"]', '1989');

        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
            page.click('button[type="submit"]')
        ]);

        console.log('Logged in. Capturing screenshot...');
        await page.screenshot({ path: path.join(__dirname, 'amrlab_dashboard.png') });

        // Let's print some basic DOM information
        const html = await page.content();
        fs.writeFileSync(path.join(__dirname, 'amrlab_dashboard.html'), html);

        console.log('Success!');
    } catch (e) {
        console.error(e);
        await page.screenshot({ path: path.join(__dirname, 'amrlab_error.png') });
    } finally {
        await browser.close();
    }
})();
