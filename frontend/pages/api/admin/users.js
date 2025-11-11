export default async function handler(req, res) {
  if (req.method !== 'GET') {
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

    const response = await fetch('http://localhost:3003/admin/users', {
      headers
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Admin users proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch users data' });
  }
}