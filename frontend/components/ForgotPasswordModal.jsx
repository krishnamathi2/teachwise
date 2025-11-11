import { useState, useEffect } from 'react'

export default function ForgotPasswordModal({ onClose }) {
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    const handleOpen = () => {
      setStep(1)
      setEmail('')
      setResetCode('')
      setNewPassword('')
      setConfirmPassword('')
      setMessage('')
      setError('')
    }
    window.addEventListener('openForgotPasswordModal', handleOpen)
    return () => window.removeEventListener('openForgotPasswordModal', handleOpen)
  }, [])

  const handleRequestReset = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('http://localhost:3003/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await response.json()
      if (response.ok) {
        setMessage(data.message)
        setStep(2)
        setError('')
      } else {
        setError(data.error || 'Failed to send reset code')
        setMessage('')
      }
    } catch (err) {
      console.error('Error requesting password reset:', err)
      setError('Failed to send reset code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyAndReset = async (e) => {
    e.preventDefault()
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('http://localhost:3003/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, resetCode, newPassword }),
      })
      const data = await response.json()
      if (response.ok) {
        setMessage(data.message)
        setStep(3)
        setError('')
        setTimeout(() => onClose(), 2500)
      } else {
        setError(data.error || 'Failed to reset password')
        setMessage('')
      }
    } catch (err) {
      console.error('Error resetting password:', err)
      setError('Failed to reset password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="forgot-password-overlay">
      <div className="forgot-password-modal">
        <div className="modal-header">
          <h2>Reset Password</h2>
          <button onClick={onClose} className="modal-close"></button>
        </div>
        {step === 1 && (
          <form onSubmit={handleRequestReset} className="reset-form">
            <p style={{ marginBottom: '12px', color: '#bfcbd6', fontSize: '13px' }}>
              Enter your email address and we'll send you a reset code.
            </p>
            <div className="form-field">
              <label htmlFor="reset-email">Email Address</label>
              <input id="reset-email" type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </div>
            {error && <div className="error-message"> {error}</div>}
            {message && <div className="success-message">{message}</div>}
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? ' Sending...' : ' Send Reset Code'}
            </button>
          </form>
        )}
        {step === 2 && (
          <form onSubmit={handleVerifyAndReset} className="reset-form">
            <p style={{ marginBottom: '12px', color: '#bfcbd6', fontSize: '13px' }}>
              Enter the 6-digit code sent to <strong>{email}</strong>
            </p>
            <div className="form-field">
              <label htmlFor="reset-code">Reset Code</label>
              <input id="reset-code" type="text" placeholder="000000" value={resetCode} onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))} required autoFocus style={{ fontSize: '18px', letterSpacing: '3px', textAlign: 'center', fontFamily: 'monospace' }} />
            </div>
            <div className="form-field">
              <label htmlFor="new-password">New Password</label>
              <div className="password-input-container">
                <input id="new-password" type={showPassword ? "text" : "password"} placeholder="Enter new password (min 6 characters)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>{showPassword ? '' : ''}</button>
              </div>
            </div>
            <div className="form-field">
              <label htmlFor="confirm-new-password">Confirm Password</label>
              <div className="password-input-container">
                <input id="confirm-new-password" type={showConfirmPassword ? "text" : "password"} placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>{showConfirmPassword ? '' : ''}</button>
              </div>
            </div>
            {error && <div className="error-message"> {error}</div>}
            {message && <div className="success-message">{message}</div>}
            <button type="submit" className="submit-btn" disabled={loading}>{loading ? ' Resetting...' : ' Reset Password'}</button>
            <button type="button" onClick={() => setStep(1)} className="back-btn" style={{ marginTop: '10px' }}> Back</button>
          </form>
        )}
        {step === 3 && (
          <div className="success-screen">
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>✅</div>
            <h3>Password Reset Successfully!</h3>
            <p>You can now login with your new password.</p>
          </div>
        )}
      </div>
    </div>
  )
}
