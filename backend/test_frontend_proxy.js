// Test posting to the frontend proxy at http://localhost:3000/api/upi-payment-confirm
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 15000);
(async () => {
  try {
    const payload = {
      email: `test+proxy@example.com`,
      amount: 100,
      transactionId: `PROXY-TX-${Date.now()}`,
      planType: 'basic'
    };

  const frontendPort = process.env.NEXT_PORT || process.env.FRONTEND_PORT || 3001;
  console.log(`Posting to frontend proxy on port ${frontendPort}...`);
  const res = await fetch(`http://localhost:${frontendPort}/api/upi-payment-confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const txt = await res.text();
    console.log('Proxy Status:', res.status);
    try { console.log('Proxy Body:', JSON.parse(txt)); } catch (e) { console.log('Proxy Body (raw):', txt); }

    // Now fetch trial-status via frontend proxy
    const emailQ = encodeURIComponent(payload.email);
  const r2 = await fetch(`http://localhost:${frontendPort}/api/trial-status?email=${emailQ}`);
  const ttxt = await r2.text();
    console.log('/api/trial-status Status:', r2.status);
    try { console.log('/api/trial-status Body:', JSON.parse(ttxt)); } catch (e) { console.log('/api/trial-status Body (raw):', ttxt); }

  } catch (err) {
    console.error('Request error:', err.message || err);
  } finally {
    clearTimeout(timeout);
  }
})();
