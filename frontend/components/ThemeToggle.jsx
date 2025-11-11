import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    } catch (e) {
      return 'light'
    }
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('theme', theme) } catch (e) {}
  }, [theme])

  return (
    <button
      className="theme-toggle"
      onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle dark mode"
    >
      {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
    </button>
  )
}
