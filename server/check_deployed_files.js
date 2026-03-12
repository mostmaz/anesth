const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
(async () => {
    try {
        await ssh.connect({ host: '161.35.216.33', username: 'root', password: '150893412C@c' });
        const res1 = await ssh.execCommand('ls -la /root/anesth/client/src/features/reports/');
        console.log('--- anesth ---');
        console.log(res1.stdout);
        const res2 = await ssh.execCommand('cat /root/anesth/client/src/features/reports/DischargeSummary.tsx | grep navigate');
        console.log(res2.stdout);

        const res3 = await ssh.execCommand('ls -la /root');
        console.log('--- root ---');
        console.log(res3.stdout);
    } catch (e) {
        console.error(e);
    } finally {
        ssh.dispose();
    }
})();
