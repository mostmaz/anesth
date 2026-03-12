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

        const name = "نوري";
        console.log(`Starting targeted remote DOM parsing debug for: ${name}`);

        const scriptContent = `
            const puppeteer = require('puppeteer-core');
            
            async function run() {
                const username = '10427';
                const password = process.env.LAB_PASSWORD || '7358782';

                console.log("Launching browser for DOM debugging...");
                const browser = await puppeteer.launch({ 
                    executablePath: '/usr/bin/google-chrome',
                    headless: true, 
                    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
                });
                
                try {
                    const page = await browser.newPage();
                    console.log("Logging in...");
                    
                    await page.goto('https://amrlab.net/login', { waitUntil: 'networkidle2' });
                    await page.type('#email', username);
                    await page.type('#password', password);
                    
                    await Promise.all([
                        page.waitForNavigation({ waitUntil: 'networkidle2' }),
                        page.click('button[type="submit"]')
                    ]);

                    console.log("Logged in. Navigating to invoices list...");
                    await page.goto('https://amrlab.net/referral/invoices', { waitUntil: 'networkidle2', timeout: 45000 });
                    await new Promise(r => setTimeout(r, 4000));

                    console.log("Entering search string: ${name}");
                    await page.evaluate((val) => {
                        const el = document.querySelector('input[type="search"]');
                        if (el) {
                            el.value = val;
                            el.dispatchEvent(new Event('input', { bubbles: true }));
                            el.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    }, '${name}');

                    console.log("Waiting 5 seconds for DataTables filtering...");
                    await new Promise(r => setTimeout(r, 5000));

                    console.log("Extracting table HTML...");
                    const tableHtml = await page.evaluate(() => {
                        const table = document.querySelector('table.dataTable');
                        return table ? table.outerHTML : 'Table not found!';
                    });

                    console.log('----- DATATABLE HTML START -----');
                    console.log(tableHtml);
                    console.log('----- DATATABLE HTML END -----');

                } catch(e) {
                    console.error('Error:', e.message);
                } finally {
                    await browser.close();
                }
            }
            run();
        `;

        const b64 = Buffer.from(scriptContent).toString('base64');
        const remoteCommand = `docker exec icu_server_prod sh -c "echo '${b64}' | base64 -d | node"`;

        const r = await ssh.execCommand(remoteCommand);
        console.log('========== STDOUT ==========');
        console.log(r.stdout);
        if (r.stderr) {
            console.log('========== STDERR ==========');
            console.log(r.stderr);
        }

        ssh.dispose();
    } catch (e) {
        console.error("SSH failed:", e.message);
        process.exit(1);
    }
})();
