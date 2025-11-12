// Health check API route to verify backend connectivity

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const results = {
    timestamp: new Date().toISOString(),
    frontend: {
      status: 'ok',
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || 'unknown'
    },
    backend: {
      status: 'unknown',
      url: null,
      error: null,
      responseTime: null
    },
    environment: {
      backendUrl: process.env.BACKEND_URL,
      publicBackend: process.env.NEXT_PUBLIC_BACKEND,
      publicBackendUrl: process.env.NEXT_PUBLIC_BACKEND_URL,
      nodeEnv: process.env.NODE_ENV
    }
  }

  try {
    // Determine backend URL
    const backendUrl = process.env.BACKEND_URL || 
                      process.env.NEXT_PUBLIC_BACKEND || 
                      process.env.NEXT_PUBLIC_BACKEND_URL || 
                      'https://teachwise-8lpxy8ra-krishnamathi2s-projects.vercel.app'

    results.backend.url = backendUrl

    // Test backend health
    const startTime = Date.now()
    
    const response = await fetch(`${backendUrl}/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TeachWise-Health-Check'
      },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    })

    results.backend.responseTime = Date.now() - startTime

    if (response.ok) {
      const data = await response.json()
      results.backend.status = 'ok'
      results.backend.data = data
    } else {
      results.backend.status = 'error'
      results.backend.error = `HTTP ${response.status}: ${response.statusText}`
    }

  } catch (error) {
    results.backend.status = 'error'
    results.backend.error = error.message

    if (error.name === 'TimeoutError') {
      results.backend.error = 'Backend timeout (>5s)'
    } else if (error.code === 'ECONNREFUSED') {
      results.backend.error = 'Connection refused - backend not running'
    }
  }

  // Determine overall status
  const overallStatus = results.backend.status === 'ok' ? 'healthy' : 'degraded'
  
  return res.status(results.backend.status === 'ok' ? 200 : 503).json({
    status: overallStatus,
    ...results
  })
}