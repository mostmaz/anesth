
const http = require('http');

const data = JSON.stringify({
    userId: 'manual-trigger-antigravity'
});

const options = {
    hostname: '161.35.216.33',
    port: 3001,
    path: '/api/lab/sync-all',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    },
    timeout: 30000
};

console.log('Triggering production sync-all...');

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
    console.error('Request timed out after 30s.');
    req.destroy();
});

req.write(data);
req.end();
