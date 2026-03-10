const http = require('http');

const options = {
    hostname: '161.35.216.33',
    port: 3001,
    path: '/api/lab/sync-all',
    method: 'POST',
    headers: {
        'Content-Length': 0
    },
    timeout: 300000
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
    console.error('Request timed out after 300s.');
    req.destroy();
});

req.end();
