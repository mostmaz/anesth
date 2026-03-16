
import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

async function debugLogin() {
    console.log('Starting Targeted Login Debug...');
    const browser = await puppeteer.launch({
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--disable-blink-features=AutomationControlled'
        ]
    });

    const page = await browser.newPage();

    // Spoofing more properties to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    const username = 'icu@amrlab.net';
    const password = '1989';

    try {
        console.log('Navigating to login page...');
        await page.goto('https://amrlab.net/referral/auth/login', { waitUntil: 'networkidle2' });
        await page.screenshot({ path: 'debug_1_initial.png' });

        console.log('Typing credentials...');
        await page.waitForSelector('input#email');
        await page.type('input#email', username, { delay: 150 });
        await page.type('input#password', password, { delay: 150 });
        await page.screenshot({ path: 'debug_2_typed.png' });

        console.log('Clicking login...');
        await Promise.all([
            page.click('button.login100-form-btn'),
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(e => console.log('Navigation timeout/error (expected if it stays on page):', e.message))
        ]);

        console.log('Current URL:', page.url());
        await page.screenshot({ path: 'debug_3_after_click.png' });

        const content = await page.content();
        if (content.includes('Failed')) {
            console.log('DETECTED: Still seeing "Failed" message.');
        } else if (page.url().includes('invoices')) {
            console.log('SUCCESS: Reached invoices page!');
        } else {
            console.log('UNKNOWN STATE: URL is', page.url());
        }

    } catch (err: any) {
        console.error('Error during debug login:', err.message);
    } finally {
        await browser.close();
        console.log('Debug complete.');
    }
}

debugLogin();
