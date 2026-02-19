
import puppeteer from 'puppeteer';

(async () => {
    try {
        console.log('Launching browser...');
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        console.log('Navigating to login page...');
        await page.goto('https://www.labforme.com/Login/');
        console.log('Page title:', await page.title());

        // Take a screenshot if possible (saved to server dir)
        await page.screenshot({ path: 'example.png' });
        console.log('Screenshot saved to example.png');

        await browser.close();
        console.log('Browser closed.');
    } catch (e) {
        console.error('Puppeteer error:', e);
    }
})();
