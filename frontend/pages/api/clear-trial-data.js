// API route to clear trial data for testing

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND || 'http://localhost:3003'
    const response = await fetch(`${backendUrl}/clear-trial-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    const data = await response.json()
    res.status(response.status).json(data)
  } catch (error) {
    console.error('Error clearing trial data:', error)
    res.status(500).json({ error: 'Failed to clear trial data' })
  }
}