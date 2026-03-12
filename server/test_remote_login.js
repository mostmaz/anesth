
const { LabImportService } = require('./dist/services/labImportService');
const path = require('path');
require('dotenv').config();

async function testLoginAndScreenshot() {
    const service = new LabImportService();
    const browser = await service.launchBrowser();
    const page = await browser.newPage();
    try {
        const username = 'icu@amrlab.net';
        const password = process.env.LAB_PASSWORD || '1989';
        console.log('Logging in with username:', username, 'and password:', password === '1989' ? '1989' : 'ENV_VAR_SET');

        await page.goto('https://amrlab.net/referral/auth/login', { waitUntil: 'networkidle2' });
        await page.type('input[name="identity"]', username);
        await page.type('input[name="password"]', password);

        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
            page.click('button[type="submit"]')
        ]);

        const loginScreenUrl = page.url();
        console.log('Current URL after login:', loginScreenUrl);

        const screenPath = path.join(process.cwd(), 'uploads', 'login_result.png');
        await page.screenshot({ path: screenPath });
        console.log(`Screenshot saved to: ${screenPath}`);

    } catch (err) {
        console.error('Login test failed:', err);
    } finally {
        await browser.close();
    }
}

testLoginAndScreenshot();
