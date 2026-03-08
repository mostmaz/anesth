const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    try {
        console.log("Launching browser...");
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        console.log("Navigating to login page...");
        await page.goto('https://amrlab.net/referral/auth/login', { waitUntil: 'networkidle2' });

        console.log("Typing credentials...");
        // the input field selectors might be standard, let's look for them or just try standard ones
        // we can dump HTML of login page first to be sure
        const html = await page.content();
        fs.writeFileSync('login_page.html', html);
        console.log("Saved login_page.html");

        await browser.close();
        console.log("Done.");
    } catch (error) {
        console.error("Error:", error);
    }
})();
