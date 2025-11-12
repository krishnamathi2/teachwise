// Connection diagnostic component to help troubleshoot API issues

import { useState } from 'react'

export default function ConnectionDiagnostic() {
  const [diagnostics, setDiagnostics] = useState([])
  const [isRunning, setIsRunning] = useState(false)

  const runDiagnostics = async () => {
    setIsRunning(true)
    const results = []

    // Test 0: Health check API
    try {
      results.push({ test: 'System Health Check', status: 'testing', message: 'Checking overall system health...' })
      setDiagnostics([...results])
      
      const response = await fetch('/api/health', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      })
      
      if (response.ok) {
        const healthData = await response.json()
        results[results.length - 1] = { 
          test: 'System Health Check', 
          status: healthData.status === 'healthy' ? 'success' : 'warning', 
          message: `${healthData.status === 'healthy' ? '✅' : '⚠️'} System Status: ${healthData.status}
Frontend: ${healthData.frontend.status}
Backend: ${healthData.backend.status} (${healthData.backend.responseTime}ms)
Backend URL: ${healthData.backend.url}
${healthData.backend.error ? `Error: ${healthData.backend.error}` : ''}` 
        }
      } else {
        const errorData = await response.json()
        results[results.length - 1] = { 
          test: 'System Health Check', 
          status: 'error', 
          message: `❌ Health check failed: ${response.status} ${response.statusText}
${errorData.backend?.error || 'Unknown error'}` 
        }
      }
    } catch (error) {
      results[results.length - 1] = { 
        test: 'System Health Check', 
        status: 'error', 
        message: `❌ Health check error: ${error.message}` 
      }
    }

    setDiagnostics([...results])

    // Test 1: Check if we can reach the primary API endpoint
    try {
      results.push({ test: 'Primary API Endpoint', status: 'testing', message: 'Testing /api/trial-status...' })
      setDiagnostics([...results])
      
      const response = await fetch('/api/trial-status?email=test@example.com', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      })
      
      if (response.ok) {
        results[results.length - 1] = { 
          test: 'Primary API Endpoint', 
          status: 'success', 
          message: `✅ API endpoint reachable (Status: ${response.status})` 
        }
      } else {
        results[results.length - 1] = { 
          test: 'Primary API Endpoint', 
          status: 'warning', 
          message: `⚠️ API endpoint returned ${response.status}: ${response.statusText}` 
        }
      }
    } catch (error) {
      results[results.length - 1] = { 
        test: 'Primary API Endpoint', 
        status: 'error', 
        message: `❌ Cannot reach API: ${error.message}` 
      }
    }

    setDiagnostics([...results])

    // Test 2: Check backend URL from environment
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND || process.env.NEXT_PUBLIC_BACKEND_URL || 'https://teachwise-8lpxy8ra-krishnamathi2s-projects.vercel.app'
    
    try {
      results.push({ test: 'Backend Environment', status: 'testing', message: `Testing ${backendUrl}...` })
      setDiagnostics([...results])
      
      const response = await fetch(`${backendUrl}/trial-status?email=test@example.com`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      })
      
      if (response.ok) {
        results[results.length - 1] = { 
          test: 'Backend Environment', 
          status: 'success', 
          message: `✅ Backend reachable at ${backendUrl} (Status: ${response.status})` 
        }
      } else {
        results[results.length - 1] = { 
          test: 'Backend Environment', 
          status: 'warning', 
          message: `⚠️ Backend returned ${response.status}: ${response.statusText}` 
        }
      }
    } catch (error) {
      results[results.length - 1] = { 
        test: 'Backend Environment', 
        status: 'error', 
        message: `❌ Cannot reach backend: ${error.message}` 
      }
    }

    setDiagnostics([...results])

    // Test 3: Check if it's a CORS issue
    try {
      results.push({ test: 'CORS Check', status: 'testing', message: 'Checking CORS configuration...' })
      setDiagnostics([...results])
      
      // Simple HEAD request to check CORS
      const response = await fetch('/api/trial-status', {
        method: 'HEAD',
      })
      
      results[results.length - 1] = { 
        test: 'CORS Check', 
        status: 'success', 
        message: `✅ CORS appears to be configured correctly` 
      }
    } catch (error) {
      if (error.message.includes('CORS')) {
        results[results.length - 1] = { 
          test: 'CORS Check', 
          status: 'error', 
          message: `❌ CORS Error: ${error.message}` 
        }
      } else {
        results[results.length - 1] = { 
          test: 'CORS Check', 
          status: 'info', 
          message: `ℹ️ CORS check inconclusive: ${error.message}` 
        }
      }
    }

    setDiagnostics([...results])

    // Test 4: Environment info
    results.push({ 
      test: 'Environment Info', 
      status: 'info', 
      message: `
        Environment: ${process.env.NODE_ENV || 'development'}
        Backend URL: ${backendUrl}
        Current URL: ${window.location.origin}
        User Agent: ${navigator.userAgent.substring(0, 50)}...
      ` 
    })

    setDiagnostics([...results])
    setIsRunning(false)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return '#10B981'
      case 'warning': return '#F59E0B'
      case 'error': return '#EF4444'
      case 'testing': return '#3B82F6'
      default: return '#6B7280'
    }
  }

  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#f8fafc', 
      border: '1px solid #e2e8f0', 
      borderRadius: '8px',
      margin: '20px',
      fontFamily: 'monospace'
    }}>
      <h3>🔧 Connection Diagnostics</h3>
      <p>This tool helps diagnose connection issues between the frontend and backend.</p>
      
      <button 
        onClick={runDiagnostics}
        disabled={isRunning}
        style={{
          padding: '10px 20px',
          backgroundColor: isRunning ? '#9CA3AF' : '#3B82F6',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: isRunning ? 'not-allowed' : 'pointer',
          marginBottom: '20px'
        }}
      >
        {isRunning ? '🔄 Running Diagnostics...' : '🚀 Run Diagnostics'}
      </button>

      {diagnostics.length > 0 && (
        <div>
          <h4>📊 Diagnostic Results:</h4>
          {diagnostics.map((diagnostic, index) => (
            <div 
              key={index} 
              style={{ 
                padding: '10px', 
                margin: '5px 0', 
                backgroundColor: 'white',
                border: `2px solid ${getStatusColor(diagnostic.status)}`,
                borderRadius: '6px'
              }}
            >
              <strong style={{ color: getStatusColor(diagnostic.status) }}>
                {diagnostic.test}:
              </strong>
              <pre style={{ 
                margin: '5px 0 0 0', 
                fontSize: '12px', 
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {diagnostic.message}
              </pre>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#6B7280' }}>
        <strong>💡 Troubleshooting Tips:</strong>
        <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
          <li>If primary API fails: Check if backend server is running</li>
          <li>If backend environment fails: Verify environment variables</li>
          <li>If CORS errors: Check CORS configuration in backend</li>
          <li>Try refreshing the page or clearing browser cache</li>
        </ul>
      </div>
    </div>
  )
}