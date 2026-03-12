const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function testLiveSite() {
    const browser = await puppeteer.launch({
        executablePath: fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe') ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : undefined,
        headless: true,
        defaultViewport: { width: 1920, height: 1080 }
    });

    try {
        const page = await browser.newPage();
        console.log('Navigating to live site...');
        await page.goto('http://161.35.216.33', { waitUntil: 'networkidle2' });

        // Check if login is needed
        if (page.url().includes('login')) {
            console.log('Logging in...');
            await page.type('input[type="text"], input[name="username"]', 'senior');
            await page.type('input[type="password"]', 'password');
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle0' }),
                page.click('button[type="submit"]')
            ]);
        }

        console.log('Waiting for patient list to load...');
        await new Promise(r => setTimeout(r, 3000));; // Give it a moment to fetch patients

        // Take screenshot
        await page.screenshot({ path: 'live_site_dashboard.png' });
        console.log('Saved screenshot to live_site_dashboard.png');

        // Check for "Archived" text which would indicate the new Tabs are present
        const hasArchivedTab = await page.evaluate(() => {
            return document.body.innerText.includes('Archived');
        });

        console.log('Is the new "Archived" tab present in the DOM?:', hasArchivedTab);

    } catch (e) {
        console.error('Error testing live site:', e);
    } finally {
        await browser.close();
    }
}

testLiveSite();
