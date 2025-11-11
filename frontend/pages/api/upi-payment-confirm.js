// API route to forward UPI payment confirmation to backend

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, amount, transactionId, planType } = req.body;

    // Forward the request to the backend
    const backendResponse = await fetch('http://localhost:3003/upi-payment-confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount,
        transactionId,
        planType,
      }),
    });

    const result = await backendResponse.json();

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Payment confirmation API error:', error);
    res.status(500).json({
      error: 'Failed to process payment confirmation',
      details: error.message,
    });
  }
}