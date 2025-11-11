import Link from 'next/link'

export default function Cancel() {
  return (
    <main className="main-container">
      <header className="header">
        <h1>Payment canceled</h1>
        <p>No charge was made. You can try again any time.</p>
      </header>
      <Link href="/pricing">Back to pricing →</Link>
    </main>
  )
}
