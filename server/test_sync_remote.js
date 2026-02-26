const { NodeSSH } = require('node-ssh');
(async () => {
    const ssh = new NodeSSH();
    await ssh.connect({ host: '161.35.216.33', username: 'root', password: '150893412C@c' });
    console.log("Connected to server...");

    const cmd = `docker exec icu_server_prod node -e "fetch('http://127.0.0.1:3001/api/lab/sync', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({patientId:'949d4d05-0ff6-4f4d-824f-33b2b25fa073',mrn:'326146-3',name:'test',authorId:'1'})}).then(r=>r.text()).then(console.log).catch(console.error)"`;

    console.log("Triggering Sync API...");
    const res = await ssh.execCommand(cmd);
    console.log("Response:", res.stdout || res.stderr);

    ssh.dispose();
})().catch(console.error);
