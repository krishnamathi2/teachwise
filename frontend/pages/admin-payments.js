import { useState } from 'react'

export default function AdminPayments() {
  const [email, setEmail] = useState('')
  const [amount, setAmount] = useState('')
  const [transactionId, setTransactionId] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleVerifyPayment = async (e) => {
    e.preventDefault()
    
    if (!email || !amount || !transactionId) {
      setMessage('All fields are required')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/upi-payment-confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          amount: parseInt(amount),
          transactionId: transactionId.trim(),
          planType: 'manual'
        }),
      })

      const result = await response.json()

      if (result.success) {
        setMessage(`✅ Payment verified! Added ${result.creditsAdded} credits to ${result.email}. Total credits: ${result.totalCredits}`)
        setEmail('')
        setAmount('')
        setTransactionId('')
      } else {
        setMessage(`❌ Error: ${result.error}`)
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '2rem', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '2rem', color: '#1f2937' }}>
        Manual Payment Verification
      </h1>
      
      <form onSubmit={handleVerifyPayment}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
            User Email:
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '2px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '1rem',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
            Amount (₹):
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="100"
            min="100"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '2px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '1rem',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
            Transaction ID:
          </label>
          <input
            type="text"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            placeholder="Transaction ID from UPI payment"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '2px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '1rem',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            background: loading ? '#9ca3af' : '#10b981',
            color: 'white',
            border: 'none',
            padding: '1rem',
            borderRadius: '8px',
            fontSize: '1.1rem',
            fontWeight: '700',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Processing...' : 'Verify Payment & Add Credits'}
        </button>
      </form>

      {message && (
        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          borderRadius: '8px',
          background: message.includes('✅') ? '#f0f9ff' : '#fef2f2',
          border: `2px solid ${message.includes('✅') ? '#3b82f6' : '#ef4444'}`,
          color: message.includes('✅') ? '#1e40af' : '#dc2626',
          fontWeight: '600'
        }}>
          {message}
        </div>
      )}

      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#374151' }}>How to use:</h3>
        <ol style={{ margin: 0, paddingLeft: '1.5rem', color: '#6b7280' }}>
          <li>Receive payment confirmation from user</li>
          <li>Verify the UPI transaction in the payment app</li>
          <li>Enter user email, amount, and transaction ID above</li>
          <li>Click "Verify Payment" to add credits to user account</li>
        </ol>
      </div>
    </div>
  )
}