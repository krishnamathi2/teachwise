// API route to proxy trial status requests to backend

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email } = req.query
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' })
  }

  try {
    // Determine backend URL with multiple fallbacks
    const backendUrl = process.env.BACKEND_URL || 
                      process.env.NEXT_PUBLIC_BACKEND || 
                      process.env.NEXT_PUBLIC_BACKEND_URL || 
                      'http://localhost:3003'

    console.log(`[${new Date().toISOString()}] Proxying trial-status request to: ${backendUrl}/trial-status for email: ${email}`)

    // Create request with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    const response = await fetch(`${backendUrl}/trial-status?email=${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'TeachWise-Frontend-Proxy',
        'X-Forwarded-For': req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown',
      },
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error(`[${new Date().toISOString()}] Backend responded with ${response.status}: ${response.statusText}`)
      
      // Return appropriate error based on backend response
      if (response.status === 404) {
        return res.status(502).json({ 
          error: 'Backend service not found', 
          details: 'The trial status service is temporarily unavailable',
          backendUrl: process.env.NODE_ENV === 'development' ? backendUrl : undefined
        })
      } else if (response.status >= 500) {
        return res.status(502).json({ 
          error: 'Backend server error', 
          details: 'The backend service encountered an error' 
        })
      } else {
        return res.status(response.status).json({ 
          error: 'Backend error', 
          details: response.statusText 
        })
      }
    }

    const data = await response.json()
    
    // Add debug information in development
    if (process.env.NODE_ENV === 'development') {
      data._debug = {
        backendUrl,
        proxyTimestamp: new Date().toISOString(),
        requestId: Math.random().toString(36).substring(7)
      }
    }

    console.log(`[${new Date().toISOString()}] Successfully proxied trial-status for ${email}`)
    return res.status(200).json(data)

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Trial status API error:`, error)
    
    // Handle specific error types
    if (error.name === 'AbortError') {
      return res.status(504).json({ 
        error: 'Gateway timeout', 
        details: 'The backend service is taking too long to respond (>10s)' 
      })
    } else if (error.code === 'ECONNREFUSED') {
      return res.status(502).json({ 
        error: 'Backend connection refused', 
        details: 'Cannot connect to the backend service. The server may be down.',
        backendUrl: process.env.NODE_ENV === 'development' ? (process.env.NEXT_PUBLIC_BACKEND || 'http://localhost:3003') : undefined
      })
    } else if (error.message.includes('fetch')) {
      return res.status(502).json({ 
        error: 'Backend connection failed', 
        details: 'Cannot connect to the backend service. Please try again later.' 
      })
    } else {
      return res.status(500).json({ 
        error: 'Internal server error', 
        details: 'An unexpected error occurred while checking trial status',
        errorMessage: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
}