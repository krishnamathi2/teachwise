// Node fetch-based test script for /upi-payment-confirm
// Usage: node test_confirm_fetch.js
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 15000);

(async () => {
  try {
    const payload = {
      email: `test+fetch@example.com`,
      amount: 100,
      transactionId: `FETCH-TX-${Date.now()}`,
      planType: 'basic'
    };

    const res = await fetch('http://localhost:3003/upi-payment-confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const text = await res.text();
    console.log('Status:', res.status);
    try {
      console.log('Body:', JSON.parse(text));
    } catch (e) {
      console.log('Body (raw):', text);
    }
  } catch (err) {
    console.error('Request error:', err.message || err);
  } finally {
    clearTimeout(timeout);
  }
})();
