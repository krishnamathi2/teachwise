import { useState } from 'react'

export default function SubscriptionModal({ isOpen, onClose, userEmail }) {
  const [amount, setAmount] = useState('400')
  const [showPaymentInfo, setShowPaymentInfo] = useState(false)

  const handleSubscribe = () => {
    const amountNum = parseInt(amount)
    if (amountNum < 400) {
      return
    }
    setShowPaymentInfo(true)
  }

  const copyUpiId = () => {
    navigator.clipboard.writeText('9629677059@ybl')
    alert('UPI ID copied to clipboard!')
  }

  if (!isOpen) return null

  return (
    <div className="subscription-modal-overlay">
      <div className="subscription-modal">
        <div className="subscription-modal-header">
          <h2>Subscribe to Continue</h2>
          <button onClick={onClose} className="modal-close">✖</button>
        </div>
        
        <div className="subscription-modal-content">
          {!showPaymentInfo ? (
            <>
              <p className="trial-message">
                Your 100 credits trial has expired. Please subscribe to continue using TeachWise.ai
              </p>

              <div className="amount-input-section">
                <label htmlFor="amount">Choose Your Amount (₹)</label>
                <input
                  id="amount"
                  type="number"
                  min="400"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Minimum ₹400"
                  className="amount-input"
                />
                <p className="amount-helper">Minimum: ₹400</p>
              </div>

              <button 
                onClick={handleSubscribe}
                disabled={parseInt(amount) < 400}
                className="subscribe-button"
              >
                Subscribe
              </button>

              <div className="plan-note">
                <h4>📊 Usage-Based Plan</h4>
                <p>
                  This plan is entirely <strong>usage-based</strong> and not period-based. 
                  Your payment gives you credits to use the service without time restrictions. For every 1 rupee you get 1 credit. For every generate 4 credits will be detected. Happy Teaching
                </p>
              </div>
            </>
          ) : (
            <div className="payment-info">
              <h3>💳 Payment Information</h3>
              <div className="payment-details">
                <p className="payment-amount">Amount: <strong>₹{amount}</strong></p>
                
                <div className="upi-section">
                  <p className="payment-instruction">Pay to this UPI ID:</p>
                  <div className="upi-id-container">
                    <span className="upi-id">9629677059@ybl</span>
                    <button onClick={copyUpiId} className="copy-btn">📋 Copy</button>
                  </div>
                </div>

                <div className="payment-steps">
                  <h4>Payment Steps:</h4>
                  <ol>
                    <li>Open your UPI app (PhonePe, GPay, Paytm, etc.)</li>
                    <li>Send ₹{amount} to <strong>9629677059@ybl</strong></li>
                    <li>After payment, contact us with transaction details</li>
                    <li>Your account will be activated within 24 hours</li>
                  </ol>
                </div>

                <div className="contact-info">
                  <p><strong>Need help?</strong> Contact us after payment with your transaction ID</p>
                </div>

                <button onClick={onClose} className="done-button">
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}