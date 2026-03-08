const puppeteer = require('puppeteer');

async function testLaunch() {
    try {
        console.log("Launching browser...");
        const browser = await puppeteer.launch({
            headless: true,
            executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-zygote',
                '--single-process',
                '--window-size=1280,800'
            ]
        });
        console.log("Browser launched successfully!");
        const page = await browser.newPage();
        await page.goto('https://example.com');
        console.log("Navigated successfully. " + await page.title());
        await browser.close();
    } catch (e) {
        console.error("Failed to launch:", e);
    }
}

testLaunch();
