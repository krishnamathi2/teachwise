export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    const response = await fetch('http://localhost:3003/admin/approve-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Error approving payment:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to approve payment',
      details: error.message 
    });
  }
}
