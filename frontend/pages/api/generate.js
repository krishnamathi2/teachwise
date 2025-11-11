// API route to proxy requests to backend

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
  // Forward the request to the backend server. Use NEXT_PUBLIC_BACKEND env var when set (e.g. http://localhost:3003)
  const backendBase = process.env.NEXT_PUBLIC_BACKEND || 'http://localhost:3003';
  const backendUrl = `${backendBase.replace(/\/$/, '')}/generate`;
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: 'Backend error', 
        detail: errorText 
      });
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: 'Connection error', 
      detail: error.message 
    });
  }
}