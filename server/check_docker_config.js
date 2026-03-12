const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
(async () => {
    try {
        await ssh.connect({ host: '161.35.216.33', username: 'root', password: '150893412C@c' });

        console.log("--- docker-compose.yml ---");
        const resCompose = await ssh.execCommand('cat /root/anesth/docker-compose.yml');
        console.log(resCompose.stdout);

        console.log("--- client/Dockerfile ---");
        const resDocker = await ssh.execCommand('cat /root/anesth/client/Dockerfile');
        console.log(resDocker.stdout);
    } catch (e) {
        console.error(e);
    } finally {
        ssh.dispose();
    }
})();
