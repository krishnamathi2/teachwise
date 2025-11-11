import Link from 'next/link'

export default function Success() {
  return (
    <main className="main-container">
      <header className="header">
        <h1>🎉 Payment successful</h1>
        <p>Your account will reflect Pro features right away.</p>
      </header>
      <Link href="/">Return to app →</Link>
    </main>
  )
}
