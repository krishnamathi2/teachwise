// Test script to check the UPI payment confirmation endpoint

const fetch = require('node-fetch');

async function testPaymentEndpoint() {
  try {
    console.log('Testing UPI payment confirmation endpoint...');
    
    const response = await fetch('http://localhost:3003/upi-payment-confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        amount: 100,
        transactionId: 'TEST123456',
        planType: 'basic'
      }),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.raw());
    
    const text = await response.text();
    console.log('Response body:', text);

    try {
      const json = JSON.parse(text);
      console.log('Parsed JSON:', json);
    } catch (e) {
      console.log('Response is not valid JSON');
    }

  } catch (error) {
    console.error('Error testing endpoint:', error.message);
  }
}

testPaymentEndpoint();