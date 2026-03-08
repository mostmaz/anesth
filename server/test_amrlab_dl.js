const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
    const downloadPath = path.resolve('./uploads');
    if (!fs.existsSync(downloadPath)) {
        fs.mkdirSync(downloadPath, { recursive: true });
    }

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox'],
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    });
    const page = await browser.newPage();

    // Set up download behavior
    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: downloadPath,
    });

    try {
        console.log('Logging in...');
        await page.goto('https://amrlab.net/laboratory/auth/login', { waitUntil: 'networkidle2' });
        await page.type('#email', 'icu@amrlab.net');
        await page.type('#password', '1989');
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
            page.click('button[type="submit"]')
        ]);

        console.log('Navigating to invoices...');
        await page.goto('https://amrlab.net/laboratory/purchase_invoices', { waitUntil: 'networkidle2' });

        console.log('Searching for patient...');
        const searchInput = 'input[placeholder="Search here ..."]';
        await page.waitForSelector(searchInput);

        console.log('Checking rows...');
        await page.waitForSelector('table#purchase_invoices_table tbody tr', { timeout: 10000 });

        const rowCount = await page.$$eval('table#purchase_invoices_table tbody tr', rows => rows.length);
        console.log(`Found ${rowCount} rows.`);

        if (rowCount > 0) {
            console.log('Selecting first checkbox...');
            await page.evaluate(() => {
                const cb = document.querySelector('.bulk_checkbox');
                if (cb) cb.click();
            });

            console.log('Clicking bulk action dropdown...');
            await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const bulkBtn = btns.find(b => b.innerText.includes('Bulk action'));
                if (bulkBtn) bulkBtn.click();
            });
            await new Promise(r => setTimeout(r, 1000));

            let pdfBuffer = null;

            // Listen for the request to the PDF endpoint
            page.on('response', async (response) => {
                const url = response.url();
                if (url.includes('print_medical_report') && response.status() === 200) {
                    console.log('Intercepted PDF response!');
                    try {
                        let contentType = response.headers()['content-type'];
                        console.log('Content-Type:', contentType);
                        pdfBuffer = await response.buffer();
                    } catch (e) {
                        console.log("Could not get buffer from response, might be a navigation event");
                    }
                }
            });

            console.log('Clicking Print medical report...');
            await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('.dropdown-menu a'));
                const printLink = links.find(l => l.innerText.includes('Print medical report'));
                if (printLink) {
                    printLink.removeAttribute('target');
                    printLink.click();
                }
            });

            console.log('Waiting for PDF response...');
            for (let i = 0; i < 15; i++) {
                if (pdfBuffer) {
                    const dlPath = path.join(downloadPath, `test_${Date.now()}.pdf`);
                    fs.writeFileSync(dlPath, pdfBuffer);
                    console.log(`Successfully saved PDF to: ${dlPath}`);
                    break;
                }
                await new Promise(r => setTimeout(r, 1000));
            }

            if (!pdfBuffer) {
                console.log('Download failed or timed out.');
            }
        }
    } catch (e) {
        console.error(e);
        await page.screenshot({ path: path.join(__dirname, 'amrlab_dl_error.png') });
    } finally {
        await browser.close();
    }
})();
