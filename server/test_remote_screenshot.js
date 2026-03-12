const { NodeSSH } = require('node-ssh');

(async () => {
    const ssh = new NodeSSH();
    try {
        await ssh.connect({
            host: '161.35.216.33',
            username: 'root',
            password: '150893412C@c',
            readyTimeout: 30000
        });

        const scriptContent = `
            const puppeteer = require('puppeteer');
            (async () => {
                const browser = await puppeteer.launch({
                    executablePath: '/usr/bin/chromium',
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                });
                const page = await browser.newPage();
                await page.goto('https://amrlab.net/referral/auth/login');
                await page.type('input[name="username"]', 'Referral-3');
                await page.type('input[name="password"]', process.env.LAB_PASSWORD);
                await Promise.all([
                    page.click('button[type="submit"]'),
                    page.waitForNavigation({ waitUntil: 'domcontentloaded' })
                ]);
                await page.goto('https://amrlab.net/referral/invoices', { waitUntil: 'domcontentloaded' });
                await page.waitForSelector('input[type="search"]');
                await page.type('input[type="search"]', 'نوري', { delay: 100 });
                await new Promise(r => setTimeout(r, 5000));
                await page.screenshot({ path: '/app/uploads/portal_search_nouri.png', fullPage: true });
                await browser.close();
                console.log('SCREENSHOT_DONE');
            })();
        `;

        const b64 = Buffer.from(scriptContent).toString('base64');
        const remoteCommand = `docker exec -e LAB_PASSWORD=${process.env.LAB_PASSWORD} icu_server_prod sh -c "echo '${b64}' | base64 -d | node"`;

        const r = await ssh.execCommand(remoteCommand);
        console.log('========== STDOUT ==========');
        console.log(r.stdout);

        ssh.dispose();
    } catch (e) {
        console.error("SSH failed:", e.message);
        process.exit(1);
    }
})();
