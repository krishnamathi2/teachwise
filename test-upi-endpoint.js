// Test script to check if backend UPI payment endpoint is working

const https = require('http');

const postData = JSON.stringify({
  email: 'test@example.com',
  amount: 100,
  transactionId: 'TEST123',
  planType: 'basic'
});

const options = {
  hostname: 'localhost',
  port: 3003,
  path: '/upi-payment-confirm',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Testing UPI payment confirmation endpoint...');

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response body:');
    console.log(data);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(postData);
req.end();