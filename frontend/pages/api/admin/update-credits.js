// API route to update user credits manually (admin only)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Forward to backend with authorization header
    const backendResponse = await fetch('http://localhost:3003/admin/update-credits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || '',
      },
      body: JSON.stringify(req.body),
    });

    const result = await backendResponse.json();

    res.status(backendResponse.status).json(result);
  } catch (error) {
    console.error('Update credits API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update credits',
      details: error.message,
    });
  }
}
