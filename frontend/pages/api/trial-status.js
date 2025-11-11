// API route to proxy trial status requests to backend

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email } = req.query
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' })
  }

  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND || 'http://localhost:3003'
    const response = await fetch(`${backendUrl}/trial-status?email=${encodeURIComponent(email)}`)
    const data = await response.json()
    
    res.status(response.status).json(data)
  } catch (error) {
    console.error('Error proxying trial status request:', error)
    res.status(500).json({ error: 'Failed to check trial status' })
  }
}