// Mobile-optimized TeachWise App

import { useState, useEffect } from 'react'
import Head from 'next/head'
import Generator from '../components/Generator'
import AuthGate from '../components/AuthGate'
import ThemeToggle from '../components/ThemeToggle'

export default function Home() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)

  useEffect(() => {
    // PWA Install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration)
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError)
        })
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      console.log(`User response to install prompt: ${outcome}`)
      setDeferredPrompt(null)
      setShowInstallPrompt(false)
    }
  }

  return (
    <>
      <Head>
        <title>TeachWise AI - Teaching Assistant App</title>
        <meta name="description" content="AI-powered mobile app for creating lesson plans, quizzes, and presentations" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#3b9bff" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="TeachWise AI" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16x16.png" />
      </Head>

      <AuthGate>
        <div className="app-container">
          {showInstallPrompt && (
            <div className="install-prompt">
              <div className="install-prompt-content">
                <span className="install-icon">📱</span>
                <div className="install-text">
                  <h4>Install TeachWise App</h4>
                  <p>Add to your home screen for the best experience</p>
                </div>
                <button onClick={handleInstallClick} className="install-btn">
                  Install
                </button>
                <button 
                  onClick={() => setShowInstallPrompt(false)} 
                  className="install-close"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          <main className="main-container">
            <header className="header">
              <div className="header-content">
                <h1>TeachWise.ai</h1>
                <p>Create engaging lesson plans and quizzes in seconds with AI</p>
              </div>
              <ThemeToggle />
            </header>
            
            <Generator />
            
            <footer className="footer">
              <p>✨ Powered by OpenAI • Built with Next.js</p>
            </footer>
          </main>
        </div>
      </AuthGate>
    </>
  )
}