
const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

(async () => {
    try {
        await ssh.connect({
            host: '161.35.216.33',
            username: 'root',
            password: '150893412C@c'
        });

        const result = await ssh.execCommand('docker exec icu_postgres_prod psql -U postgres -d icu_db -c "SELECT id, name, mrn FROM \\"Patient\\" LIMIT 20;"');
        console.log("STDOUT:", result.stdout);
        console.log("STDERR:", result.stderr);
        ssh.dispose();
    } catch (e) {
        console.error("SSH Error:", e);
    }
})();
