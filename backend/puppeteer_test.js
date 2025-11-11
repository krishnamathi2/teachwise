// Puppeteer end-to-end test for pricing UPI payment confirmation
// Usage: node puppeteer_test.js
const puppeteer = require('puppeteer');

(async () => {
  const frontendPort = process.env.FRONTEND_PORT || 3001;
  const backendPort = process.env.BACKEND_PORT || 3003;
  const testEmail = `test+puppeteer@example.com`;
  const transactionId = `PUPP-TX-${Date.now()}`;

  console.log('Starting Puppeteer test...');
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  try {
    const url = `http://localhost:${frontendPort}/pricing`;
    console.log('Navigating to', url);
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Ensure localStorage has a user so pricing page shows account block
    await page.evaluate((email) => {
      try {
        localStorage.setItem('teachwise_user', JSON.stringify({ email }));
      } catch (e) {
        // ignore
      }
    }, testEmail);

    // Reload so the page picks up the localStorage
    await page.reload({ waitUntil: 'networkidle2' });

    // Click Basic Plan button (robust selector by button text)
    console.log('Clicking Get Basic Plan...');
    await page.waitForSelector('button');
    const clicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => /Get Basic Plan/i.test(b.innerText));
      if (btn) { btn.click(); return true; }
      return false;
    });
    if (!clicked) throw new Error('Get Basic Plan button not found');

    // Wait for UPI modal to appear (class upi-modal)
    await page.waitForSelector('.upi-modal', { visible: true });
    console.log('UPI modal shown');

    // Click Payment Completed button which has id payment-done-btn
    await page.waitForSelector('#payment-done-btn', { visible: true });
    await page.click('#payment-done-btn');
    console.log('Clicked Payment Completed');

    // Wait for confirmation form
    await page.waitForSelector('#payment-confirmation-form', { visible: true });

    // Fill email and transaction id
    await page.$eval('#user-email', (el, value) => el.value = value, testEmail);
    await page.$eval('#transaction-id', (el, value) => el.value = value, transactionId);

    // Submit form
    console.log('Submitting confirmation form...');
    await page.click('#submit-confirmation-btn');

    // Wait for success message in modal (Payment Confirmed)
    await page.waitForFunction(() => document.body.innerText.includes('Payment Confirmed!'), { timeout: 15000 });
    console.log('Seen success message in UI');

    // Verify backend trial-status shows credits updated
    const statusRes = await fetch(`http://localhost:${backendPort}/trial-status?email=${encodeURIComponent(testEmail)}`);
    const status = await statusRes.json();
    console.log('Backend trial-status:', status);

    if (!status || status.credits < 100) {
      throw new Error('Credits not updated as expected: ' + JSON.stringify(status));
    }

    console.log('Puppeteer test passed: credits added and UI success shown');
    await browser.close();
    process.exitCode = 0;
  } catch (err) {
    console.error('Puppeteer test failed:', err);
    try { await browser.close(); } catch (e) {}
    process.exitCode = 2;
  }
})();
