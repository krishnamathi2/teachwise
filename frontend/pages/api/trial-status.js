// frontend/pages/api/trial-status.js

export default async function handler(req, res) {
  // Allow both GET and POST so we never hit 405 again
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed',
    });
  }

  try {
    // 🔹 Temporary simple response so the UI works
    // You can adjust these values later when we finalize the real trial logic.
    return res.status(200).json({
      success: true,
      hasTrial: true,
      isTrialExpired: false,
      remainingCredits: 10,
      source: 'temporary-static-response',
    });
  } catch (err) {
    console.error('trial-status error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
