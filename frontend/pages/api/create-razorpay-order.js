export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const backendBase = process.env.NEXT_PUBLIC_BACKEND || 'http://localhost:3003';
    const response = await fetch(`${backendBase.replace(/\/$/, '')}/create-razorpay-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {})
    })
    const data = await response.json()
    if (!response.ok) return res.status(response.status).json(data)
    res.status(200).json(data)
  } catch (e) {
    res.status(500).json({ error: 'Proxy error', detail: e.message })
  }
}
