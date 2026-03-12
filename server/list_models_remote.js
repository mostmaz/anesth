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
            const API_KEY = process.env.GEMINI_API_KEY;
            const url = "https://generativelanguage.googleapis.com/v1beta/models?key=" + API_KEY;
            fetch(url).then(r => r.json()).then(data => {
                if (data.models) {
                    console.log("MODELS: " + data.models.map(m => m.name).join(", "));
                } else {
                    console.log("ERROR: " + JSON.stringify(data));
                }
            }).catch(e => console.log("FETCH_ERROR: " + e.message));
        `;

        const b64 = Buffer.from(scriptContent).toString('base64');
        const remoteCommand = `docker exec icu_server_prod sh -c "echo '${b64}' | base64 -d | node"`;

        const r = await ssh.execCommand(remoteCommand);
        console.log('========== STDOUT ==========');
        console.log(r.stdout);

        ssh.dispose();
    } catch (e) {
        console.error("SSH failed:", e.message);
        process.exit(1);
    }
})();
