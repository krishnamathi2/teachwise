// API proxy for slide generation
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
  const backendBase = process.env.NEXT_PUBLIC_BACKEND || 'http://localhost:3003';
  const response = await fetch(`${backendBase.replace(/\/$/, '')}/generate-slides`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    })

    const data = await response.json()
    
    if (!response.ok) {
      return res.status(response.status).json(data)
    }

    res.status(200).json(data)
  } catch (error) {
    console.error('Slide generation error:', error)
    res.status(500).json({ 
      error: 'Failed to generate slides', 
      detail: error.message 
    })
  }
}