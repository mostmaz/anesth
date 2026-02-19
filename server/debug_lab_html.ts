
import puppeteer from 'puppeteer';
import fs from 'fs';

async function run() {
    // System chrome logic
    const fsNode = require('fs');
    let executablePath = '';
    const possiblePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    ];
    for (const path of possiblePaths) {
        if (fsNode.existsSync(path)) { executablePath = path; break; }
    }

    const browser = await puppeteer.launch({
        headless: true,
        executablePath: executablePath || undefined,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    try {
        console.log("Navigating...");
        await page.goto('https://www.labforme.com/Login/', { waitUntil: 'networkidle2', timeout: 30000 });

        console.log("Saving HTML...");
        const html = await page.content();
        fs.writeFileSync('debug-page.html', html);
        console.log("HTML saved to debug-page.html");

        // Also take a screenshot
        await page.screenshot({ path: 'debug-page.png' });

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await browser.close();
    }
}

run();
