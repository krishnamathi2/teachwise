export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (authHeader) {
      headers.Authorization = authHeader;
    }

    const response = await fetch('http://localhost:3003/admin/update-credits-per-generate', {
      method: 'POST',
      headers,
      body: JSON.stringify(req.body)
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Update credits per generate proxy error:', error);
    res.status(500).json({ error: 'Failed to update credits per generate' });
  }
}