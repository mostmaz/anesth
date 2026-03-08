const http = require('http');

const data = JSON.stringify({
    patientId: '38b62b34-4f1f-496f-974c-fb8fc34d934b',
    mrn: '102873-0',
    name: 'حكمت عبدالرزاق عبدالله سليم',
    authorId: 'mock-nurse-id'
});

const options = {
    hostname: '161.35.216.33',
    port: 3001,
    path: '/api/lab/sync',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    },
    timeout: 120000
};

console.log('Triggering production sync for MRN: 102873-0...');

const req = http.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log('Response Body:', body);
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.on('timeout', () => {
    console.error('Request timed out after 120s.');
    req.destroy();
});

req.write(data);
req.end();
