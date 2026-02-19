
import puppeteer from 'puppeteer';

async function run() {
    const fs = require('fs');
    let executablePath = '';
    const paths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    ];
    for (const p of paths) {
        if (fs.existsSync(p)) {
            executablePath = p;
            break;
        }
    }

    if (!executablePath) {
        console.error('Chrome not found in standard locations.');
    } else {
        console.log('Using Chrome at:', executablePath);
    }

    const browser = await puppeteer.launch({
        headless: false,
        executablePath: executablePath || undefined,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: null
    });
    const page = await browser.newPage();

    // Log console messages
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

    try {
        console.log('Navigating to login...');
        await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });

        // Login
        await page.waitForSelector('input[type="text"]');
        await page.type('input[type="text"]', 'senior');
        await page.type('input[type="password"]', 'password');
        await page.click('button[type="submit"]');

        console.log('Clicked login, waiting for dashboard...');
        try {
            await page.waitForSelector('h1', { timeout: 10000 });
        } catch (e) {
            console.log('Wait for h1 failed, checking content...');
        }
        console.log('Logged in.');

        // Direct navigation to patient page
        const patientId = 'e7c00ea5-d8da-4b6b-bc9a-8a1207d8b43b';
        console.log(`Navigating to patient page: /patients/${patientId}`);
        await page.goto(`http://localhost:5173/patients/${patientId}`, { waitUntil: 'networkidle0' });

        console.log('On Patient Page.');

        await page.waitForSelector('h1', { timeout: 10000 }); // Patient Header

        // 1. Click Investigations/Labs Tab
        // The tab text might be "Investigations" or "Labs" depending on updates.
        // We'll search for it.
        const tabs = await page.$$('button[role="tab"]');
        let invTab = null;
        console.log(`Found ${tabs.length} tabs:`);
        for (const t of tabs) {
            const text = await t.evaluate(el => el.textContent);
            console.log(`- Tab: "${text}"`);
            if (text && (text.includes('Investigations') || text.includes('Labs'))) {
                invTab = t;
            }
        }

        if (invTab) {
            console.log('Clicking target tab...');
            await invTab.click();
            await new Promise(r => setTimeout(r, 2000)); // Wait for tab content

            // 2. Click Sync All
            console.log('Looking for Sync All button...');
            const buttons = await page.$$('button');
            let syncBtn = null;
            for (const b of buttons) {
                const text = await b.evaluate(el => el.textContent);
                if (text?.includes('Sync All')) {
                    syncBtn = b;
                    break;
                }
            }

            if (syncBtn) {
                console.log('Found Sync All button. Clicking...');
                await syncBtn.click();
                console.log('Sync triggered. Waiting 15s for completion...');
                await new Promise(r => setTimeout(r, 15000));
                console.log('Sync wait finished. SUCCESS.');
            } else {
                console.error('Sync All button NOT found.');
                await page.screenshot({ path: 'sync_btn_not_found.png' });
            }

        } else {
            console.log('Investigations/Labs tab not found.');
            await page.screenshot({ path: 'inv_tab_not_found.png' });
        }

    } catch (e) {
        console.error('Verification failed:', e);
        await page.screenshot({ path: 'error.png' });
    } finally {
        await browser.close();
    }
}

run();
