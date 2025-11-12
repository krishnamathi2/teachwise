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
    // Test Supabase connectivity instead of external backend
    const startTime = Date.now()
    
    // Test Supabase connection by making a simple query
    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    // Test database connectivity
    const { data, error } = await supabase
      .from('user_trials')
      .select('*', { count: 'exact', head: true })

    results.backend.responseTime = Date.now() - startTime
    results.backend.url = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (error) {
      results.backend.status = 'error'
      results.backend.error = `Supabase error: ${error.message}`
    } else {
      results.backend.status = 'ok'
      results.backend.note = 'Supabase database accessible'
      results.backend.data = { connection: 'successful' }
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