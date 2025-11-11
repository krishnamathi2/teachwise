export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/reset-users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error('Admin reset users API error:', error);
    res.status(500).json({ error: 'Failed to reset users' });
  }
}