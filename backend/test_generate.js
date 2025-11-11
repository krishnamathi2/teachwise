const fetch = require('node-fetch');
const fs = require('fs');

(async () => {
  try {
    const backendBase = process.env.BACKEND_URL || 'http://localhost:3003';
    const res = await fetch(`${backendBase.replace(/\/$/, '')}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'quiz', grade: '7', subject: 'Science', topic: 'Photosynthesis' }),
      timeout: 120000
    });
    const text = await res.text();
    fs.writeFileSync('last_quiz_full.txt', text, 'utf8');
    console.log('Saved to backend/last_quiz_full.txt');
  } catch (e) {
    console.error('Error:', e.message || e);
    process.exit(1);
  }
})();
