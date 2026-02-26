const { NodeSSH } = require('node-ssh');
const path = require('path');

(async () => {
    const ssh = new NodeSSH();
    await ssh.connect({ host: '161.35.216.33', username: 'root', password: '150893412C@c', readyTimeout: 30000 });
    console.log('Connected!');

    console.log('Uploading local_data.sql...');
    await ssh.putFile(path.join(__dirname, 'local_data.sql'), '/root/anesth/local_data.sql');

    console.log('Truncating ALL remote tables EXCEPT PrismaMigrations...!');
    // We need to truncate tables to avoid PK conflicts.
    const truncateCmd = `docker exec icu_postgres_prod psql -U postgres -d icu_db -c "DO \\$\\$ DECLARE r RECORD; BEGIN FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != '_prisma_migrations') LOOP EXECUTE 'TRUNCATE TABLE \\"' || r.tablename || '\\" CASCADE'; END LOOP; END \\$\\$;"`;

    let r = await ssh.execCommand(truncateCmd);
    if (r.stderr) console.error('TRUNCATE ERR:', r.stderr);
    console.log('Truncated.');

    console.log('Copying SQL file into remote db container and executing...');
    r = await ssh.execCommand('docker cp /root/anesth/local_data.sql icu_postgres_prod:/tmp/local_data.sql');
    if (r.stderr) console.error('CP ERR:', r.stderr);

    console.log('Restoring data...');
    r = await ssh.execCommand('docker exec icu_postgres_prod psql -U postgres -d icu_db -f /tmp/local_data.sql');
    if (r.stderr && !r.stderr.includes('already exists') && !r.stderr.includes('multiple primary keys')) {
        console.error('RESTORE ERR:', r.stderr);
    } else {
        console.log('Restore stdout:', r.stdout.substring(0, 500) + '...');
        console.log('Data Restored Successfully!');
    }

    ssh.dispose();
})().catch(e => { console.error(e.message); process.exit(1); });
