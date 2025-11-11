// Simple Node script to POST a UPI payment confirmation to the local backend
// Usage: node test_confirm.js
const http = require('http');

const payload = JSON.stringify({
  email: 'test+upi@example.com',
  amount: 100,
  transactionId: `TEST-TX-${Date.now()}`,
  planType: 'basic'
});

const options = {
  hostname: 'localhost',
  port: 3003,
  path: '/upi-payment-confirm',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  },
  timeout: 5000
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    try {
      console.log('Response:', JSON.parse(data));
    } catch (e) {
      console.log('Response (raw):', data);
    }
  });
});

req.on('error', (err) => {
  console.error('Request error:', err.message);
});

req.on('timeout', () => {
  console.error('Request timed out');
  req.destroy();
});

req.write(payload);
req.end();
