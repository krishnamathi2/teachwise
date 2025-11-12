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
      publicBackendUrl: process.env.NEXT_PUBLIC_BACKEND || 'https://teachwise-mvp.vercel.app',
      nodeEnv: process.env.NODE_ENV
    }
  }

  try {
    // For Vercel deployment, we'll check if we can access our own API routes
    // Since backend is integrated via API routes, we test internal connectivity
    
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND || 
                      'https://teachwise-mvp.vercel.app'

    results.backend.url = backendUrl

    // Test internal API connectivity by checking if we can make a simple request
    const startTime = Date.now()
    
    // For Vercel deployment, test the trial-status endpoint which is our main API
    const response = await fetch(`${backendUrl}/api/trial-status`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'TeachWise-Health-Check'
      },
      body: JSON.stringify({ email: 'health-check@test.com' }),
      signal: AbortSignal.timeout(5000) // 5 second timeout
    })

    results.backend.responseTime = Date.now() - startTime

    if (response.ok || response.status === 400) {
      // 200 OK or 400 Bad Request both indicate the API is responding
      results.backend.status = 'ok'
      results.backend.note = 'API endpoints accessible'
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