
const { LabImportService } = require('./dist/services/labImportService');
const path = require('path');
const fs = require('fs');

async function dumpLogin() {
    const service = new LabImportService();
    // Launch browser with full args to bypass basic bot detection
    const browser = await service.launchBrowser();
    const page = await browser.newPage();
    try {
        await page.goto('https://amrlab.net/referral/auth/login', { waitUntil: 'networkidle2' });

        console.log('Current URL after load:', page.url());

        const screenPath = path.join(process.cwd(), 'uploads', 'login_page.png');
        await page.screenshot({ path: screenPath });
        console.log(`Screenshot saved to: ${screenPath}`);

        const html = await page.content();
        fs.writeFileSync(path.join(process.cwd(), 'uploads', 'page.html'), html);
        console.log('HTML saved to /app/uploads/page.html');

    } catch (err) {
        console.error('Login dump failed:', err);
    } finally {
        await browser.close();
    }
}

dumpLogin();
