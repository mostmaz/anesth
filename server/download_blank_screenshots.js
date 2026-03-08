const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
(async () => {
    try {
        await ssh.connect({ host: '161.35.216.33', username: 'root', password: '150893412C@c' });

        const files = [
            'sync-2260306126-1772991172860-333.png',
            'sync-226030690-1772991177886-439.png',
            'sync-226030626-1772991183867-131.png'
        ];

        for (const file of files) {
            console.log(`Checking for ${file} in container...`);
            let r = await ssh.execCommand(`docker exec icu_server_prod ls -lh /app/uploads/${file}`);
            console.log(r.stdout || r.stderr);

            if (r.stdout.includes(file)) {
                console.log(`Downloading ${file}...`);
                // Use cat and redirect to bypass docker cp permissions if any
                await ssh.execCommand(`docker exec icu_server_prod cat /app/uploads/${file} > /tmp/${file}`);
                await ssh.getFile(`c:\\Users\\Administrator\\Documents\\d\\ICU-Manager\\server\\${file}`, `/tmp/${file}`);
            }
        }

        ssh.dispose();
    } catch (e) {
        console.error(e);
    }
})();
