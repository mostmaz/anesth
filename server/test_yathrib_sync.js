const { NodeSSH } = require('node-ssh');
const fs = require('fs');

(async () => {
    const ssh = new NodeSSH();
    try {
        await ssh.connect({
            host: '161.35.216.33',
            username: 'root',
            password: '150893412C@c',
            readyTimeout: 30000
        });

        // 1. Find the Yathrib patient in the DB
        console.log('--- Finding Yathrib patient ---');
        let r = await ssh.execCommand(
            `docker exec icu_server_prod node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.patient.findMany({ where: { name: { contains: 'يثرب' } }, include: { admissions: { where: { dischargedAt: null } } } })
  .then(pts => { console.log(JSON.stringify(pts.map(pt => ({ id: pt.id, name: pt.name, mrn: pt.mrn, admitted: pt.admissions.length > 0 })))); process.exit(0); })
  .catch(e => { console.error(e.message); process.exit(1); });
"`
        );
        console.log('DB Result:', r.stdout || r.stderr);

        const patients = JSON.parse(r.stdout || '[]');
        if (!patients.length) {
            console.log('No Yathrib patient found in DB!');
            ssh.dispose();
            return;
        }

        const pt = patients[0];
        console.log(`Found: ${pt.name} (${pt.mrn}) - admitted: ${pt.admitted}`);

        // 2. Trigger the sync API
        console.log('\n--- Triggering sync ---');
        r = await ssh.execCommand(
            `curl -s -X POST http://localhost:3001/api/lab/sync \
  -H "Content-Type: application/json" \
  -d '{"patientId":"${pt.id}","mrn":"${pt.mrn}","name":"${pt.name}","authorId":"mock-nurse-id"}'`
        );
        console.log('Sync API Response:', r.stdout || r.stderr);

        // 3. Wait for sync to complete then show container logs
        await new Promise(res => setTimeout(res, 5000));
        console.log('\n--- Container logs (last 80 lines) ---');
        r = await ssh.execCommand('docker logs icu_server_prod --tail 80');
        const logs = (r.stdout || r.stderr);
        fs.writeFileSync('yathrib_sync_result.txt', logs, 'utf8');
        console.log(logs);

        ssh.dispose();
    } catch (e) {
        console.error("Error:", e.message);
        process.exit(1);
    }
})();
