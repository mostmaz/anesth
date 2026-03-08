const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
(async () => {
    try {
        await ssh.connect({ host: '161.35.216.33', username: 'root', password: '150893412C@c' });

        const testScript = `
const puppeteer = require('puppeteer');
(async () => {
    console.log('Testing Puppeteer Launch...');
    console.log('Executable Path:', process.env.PUPPETEER_EXECUTABLE_PATH || 'default');
    try {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        console.log('Browser launched successfully!');
        const page = await browser.newPage();
        await page.goto('https://google.com');
        console.log('Page title:', await page.title());
        await browser.close();
        process.exit(0);
    } catch (e) {
        console.error('Launch failed:', e.message);
        process.exit(1);
    }
})();
        `;

        await ssh.execCommand('echo "' + testScript.replace(/"/g, '\\"') + '" > /tmp/test_puppeteer_prod.js');
        let r = await ssh.execCommand('docker exec icu_server_prod node -e "' + testScript.replace(/"/g, '\\"').replace(/\n/g, '') + '"');
        console.log('Test Output:', r.stdout || r.stderr);

        ssh.dispose();
    } catch (e) {
        console.error(e);
    }
})();
