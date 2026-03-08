const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
(async () => {
    try {
        await ssh.connect({ host: '161.35.216.33', username: 'root', password: '150893412C@c' });
        console.log('Searching logs for scraping and matching details...');
        let r = await ssh.execCommand('docker logs icu_server_prod 2>&1 | grep -E "Scraped|Name-matched|Filtering|Processing report" | tail -n 50');
        console.log('Search Results:');
        console.log(r.stdout || 'No matching log entries found.');
        ssh.dispose();
    } catch (e) {
        console.error(e);
    }
})();
