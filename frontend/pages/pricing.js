import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function Pricing() {
  const [loading, setLoading] = useState(false)
  const [userStatus, setUserStatus] = useState(null)

  // Check user status on component mount
  useEffect(() => {
    checkUserStatus()
  }, [])

  const checkUserStatus = async () => {
    try {
      const savedUser = localStorage.getItem('teachwise_user')
      if (savedUser) {
        const userData = JSON.parse(savedUser)
        const response = await fetch(`/api/trial-status?email=${encodeURIComponent(userData.email)}`)
        const data = await response.json()
        setUserStatus({ email: userData.email, ...data })
      }
    } catch (error) {
      console.error('Error checking user status:', error)
    }
  }

  const startUPIPayment = async (amountInRupees, credits, planName) => {
    try {
      setLoading(true)
      
      // UPI payment details
      const upiId = '9629677059@ybl'
      const merchantName = 'TeachWise'
      const transactionNote = `${planName} - ${credits} Credits`
      
      // Show payment modal with QR code and multiple options
      showUPIPaymentModal(upiId, amountInRupees, planName, credits, transactionNote)
      
    } catch (error) {
      alert('Unable to initiate UPI payment: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const generateQRCode = (upiId, amount, note) => {
    const upiString = `upi://pay?pa=${upiId}&pn=TeachWise&tn=${encodeURIComponent(note)}&am=${amount}&cu=INR`
    // Using a QR code API service
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiString)}`
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('UPI ID copied to clipboard!')
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      alert('UPI ID copied to clipboard!')
    })
  }

  const showPaymentConfirmationForm = (amount, planName, credits) => {
    // Get user email from localStorage
    let userEmail = ''
    try {
      const savedUser = localStorage.getItem('teachwise_user')
      if (savedUser) {
        const userData = JSON.parse(savedUser)
        userEmail = userData.email || ''
      }
    } catch (e) {
      console.error('Error getting user email:', e)
    }

    // Create confirmation modal
    const modal = document.createElement('div')
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      overflow-y: auto;
    `
    
    const modalContent = document.createElement('div')
    modalContent.style.cssText = `
      background: white;
      padding: 2rem;
      border-radius: 12px;
      max-width: 500px;
      width: 90%;
      text-align: center;
      max-height: 90vh;
      overflow-y: auto;
    `
    
    modalContent.innerHTML = `
      <h3 style="margin-bottom: 1rem; color: #1a202c; font-weight: bold; font-size: 1.4rem;">Confirm Your Payment</h3>
      
      <div style="background: #f0f9ff; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; border: 1px solid #bfdbfe;">
        <p style="margin: 0.5rem 0; color: #1e40af; font-weight: 600;"><strong>Plan:</strong> ${planName}</p>
        <p style="margin: 0.5rem 0; color: #1e40af; font-weight: 600;"><strong>Credits:</strong> ${credits}</p>
        <p style="margin: 0.5rem 0; font-size: 1.2rem; color: #1e40af; font-weight: bold;"><strong>Amount: ₹${amount}</strong></p>
      </div>

      <form id="payment-confirmation-form">
        <div style="margin-bottom: 1rem; text-align: left;">
          <label style="display: block; margin-bottom: 0.5rem; color: #374151; font-weight: 600;">Your Email:</label>
          <input 
            type="email" 
            id="user-email" 
            value="${userEmail}"
            required
            style="width: 100%; padding: 0.75rem; border: 2px solid #d1d5db; border-radius: 6px; font-size: 1rem; box-sizing: border-box;"
            placeholder="Enter your email address"
          />
        </div>

        <div style="margin-bottom: 1rem; text-align: left;">
          <label style="display: block; margin-bottom: 0.5rem; color: #374151; font-weight: 600;">Transaction ID / UTR Number:</label>
          <input 
            type="text" 
            id="transaction-id" 
            required
            minlength="8"
            style="width: 100%; padding: 0.75rem; border: 2px solid #d1d5db; border-radius: 6px; font-size: 1rem; box-sizing: border-box;"
            placeholder="e.g., 404912345678"
          />
          <p style="margin: 0.5rem 0 0 0; font-size: 0.85rem; color: #6b7280; line-height: 1.4;">
            📱 <strong>Where to find it:</strong><br/>
            • Open your UPI app (Google Pay, PhonePe, Paytm, etc.)<br/>
            • Go to transaction history<br/>
            • Find your payment to @mathivananponnusamy<br/>
            • Copy the 12-digit Transaction ID/UTR number<br/>
            • <strong style="color: #dc2626;">⚠️ Must be a real transaction ID (minimum 8 characters)</strong>
          </p>
        </div>
          </p>
        </div>

        <div style="margin-bottom: 1.5rem; background: #fef3c7; padding: 1rem; border-radius: 6px; border: 1px solid #f59e0b;">
          <p style="margin: 0; color: #92400e; font-size: 0.9rem; font-weight: 600;">
            ⚠️ Important: Only submit after completing the payment to 9629677059@ybl
          </p>
        </div>

        <div style="display: flex; gap: 1rem; justify-content: center;">
          <button 
            type="button" 
            id="cancel-confirmation-btn" 
            style="background: #e5e7eb; color: #374151; border: none; padding: 1rem 2rem; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 1rem;">
            Cancel
          </button>
          <button 
            type="submit" 
            id="submit-confirmation-btn" 
            style="background: #10b981; color: white; border: none; padding: 1rem 2rem; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 1rem;">
            Confirm Payment ✅
          </button>
        </div>
      </form>

      <div id="confirmation-loading" style="display: none; margin-top: 1rem;">
        <p style="color: #6b7280; margin: 0;">Processing your confirmation...</p>
        <div style="margin: 1rem auto; width: 2rem; height: 2rem; border: 3px solid #e5e7eb; border-top: 3px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      </div>

      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `
    
    modal.appendChild(modalContent)
    document.body.appendChild(modal)
    
    // Add event listeners
    document.getElementById('cancel-confirmation-btn').addEventListener('click', () => {
      modal.remove()
    })
    
    document.getElementById('payment-confirmation-form').addEventListener('submit', async (e) => {
      e.preventDefault()
      
      const email = document.getElementById('user-email').value.trim()
      const transactionId = document.getElementById('transaction-id').value.trim()
      
      if (!email || !transactionId) {
        alert('Please fill in all required fields')
        return
      }
      
      // Show loading
      document.getElementById('confirmation-loading').style.display = 'block'
      document.getElementById('submit-confirmation-btn').disabled = true
      document.getElementById('submit-confirmation-btn').textContent = 'Processing...'
      
      try {
        // Determine plan type for backend
        let planType = 'manual'
        if (amount === 100 && credits === 100) {
          planType = 'basic'
        } else if (amount === 750 && credits === 1000) {
          planType = 'premium'
        }
        
        console.log('Submitting payment confirmation:', { email, amount, transactionId, planType })
        
        const response = await fetch('/api/upi-payment-confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email,
            amount,
            transactionId,
            planType
          })
        })
        
        console.log('Payment response status:', response.status)
        const result = await response.json()
        console.log('Payment response data:', result)
        
        if (result.success) {
          console.log('✅ Payment confirmed successfully!')
          
          // Close the modal first
          modal.remove()
          
          // Show different message based on payment status
          if (result.status === 'pending') {
            // Payment is pending admin approval
            alert(`✅ Payment Submitted Successfully!\n\n📧 Email: ${result.email || email}\n💳 Transaction ID: ${result.transactionId || transactionId}\n💰 Amount: ₹${result.amount || amount}\n\n⏳ Your payment is now pending admin verification.\n\nOnce verified, credits will be added to your account automatically.\n\nThank you for your patience!\n\nClick OK to return to the home page.`)
          } else {
            // Payment was auto-approved (old flow - should not happen anymore)
            alert(`✅ Payment Confirmed!\n\n${result.creditsAdded} credits have been added to your account.\n\nTotal Credits: ${result.totalCredits}\n\n🎉 You are now a PAID USER!\n\nClick OK to go to the home page.`)
          }
          
          // Dispatch events to notify components
          window.dispatchEvent(new Event('payment-success'))
          window.dispatchEvent(new Event('credits-updated'))
          
          // Refresh user status
          try {
            checkUserStatus()
          } catch (e) {
            console.warn('Failed to refresh user status:', e)
          }
          
          // Redirect to home page
          console.log('Redirecting to home page...')
          window.location.href = '/'
        } else {
          console.error('Payment confirmation failed:', result)
          throw new Error(result.error || 'Payment confirmation failed')
        }
        
      } catch (error) {
        console.error('Payment confirmation error:', error)
        
        // Show detailed error message
        let errorMessage = 'Error confirming payment:\n\n'
        
        if (error.message.includes('Transaction already processed')) {
          errorMessage += '❌ This transaction ID has already been used.\n\n'
          errorMessage += 'Each payment must have a unique transaction ID. Please check:\n'
          errorMessage += '• Did you already submit this payment?\n'
          errorMessage += '• Are you using the correct transaction ID from your UPI app?'
        } else if (error.message.includes('Invalid transaction ID')) {
          errorMessage += '❌ Invalid transaction ID.\n\n'
          errorMessage += 'Please provide a valid transaction ID from your UPI payment:\n'
          errorMessage += '• Must be at least 8 characters long\n'
          errorMessage += '• Cannot be a test/fake ID (like "test123", "dummy", etc.)\n'
          errorMessage += '• Must be copied from your actual UPI payment receipt'
        } else if (error.message.includes('Minimum payment')) {
          errorMessage += '❌ Minimum payment amount is ₹100'
        } else {
          errorMessage += error.message + '\n\nPlease try again or contact support.'
        }
        
        alert(errorMessage)
        
        // Reset form (check if elements exist first)
        const loadingEl = document.getElementById('confirmation-loading')
        const submitBtn = document.getElementById('submit-confirmation-btn')
        
        if (loadingEl) loadingEl.style.display = 'none'
        if (submitBtn) {
          submitBtn.disabled = false
          submitBtn.textContent = 'Confirm Payment ✅'
        }
      }
    })
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove()
      }
    })
  }

  const showUPIPaymentModal = (upiId, amount, planName, credits, note) => {
    // Create modal for UPI payment
    const modal = document.createElement('div')
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      overflow-y: auto;
    `
    
    const modalContent = document.createElement('div')
    modalContent.style.cssText = `
      background: white;
      padding: 2rem;
      border-radius: 12px;
      max-width: 450px;
      width: 90%;
      text-align: center;
      max-height: 90vh;
      overflow-y: auto;
    `
    
    const qrCodeUrl = generateQRCode(upiId, amount, note)
    
    modalContent.innerHTML = `
      <h3 style="margin-bottom: 1rem; color: #1a202c; font-weight: bold; font-size: 1.3rem;">Complete Payment</h3>
      
      <div style="background: #f7fafc; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; border: 1px solid #e2e8f0;">
        <p style="margin: 0.5rem 0; color: #2d3748; font-weight: 600;"><strong>Plan:</strong> ${planName}</p>
        <p style="margin: 0.5rem 0; color: #2d3748; font-weight: 600;"><strong>Credits:</strong> ${credits}</p>
        <p style="margin: 0.5rem 0; font-size: 1.3rem; color: #2b6cb0; font-weight: bold;"><strong>Amount: ₹${amount}</strong></p>
      </div>

      <div style="margin-bottom: 1.5rem;">
        <h4 style="margin-bottom: 1rem; color: #2d3748; font-weight: bold; font-size: 1.1rem;">Method 1: Scan QR Code</h4>
        <div style="display: flex; justify-content: center; margin-bottom: 1rem;">
          <img src="${qrCodeUrl}" alt="UPI QR Code" style="border: 2px solid #e2e8f0; border-radius: 8px;" />
        </div>
        <p style="font-size: 1rem; color: #4a5568; font-weight: 500;">
          Scan with any UPI app (PhonePe, Google Pay, Paytm, etc.)
        </p>
      </div>

      <div style="margin-bottom: 1.5rem;">
        <h4 style="margin-bottom: 1rem; color: #2d3748; font-weight: bold; font-size: 1.1rem;">Method 2: Manual Payment</h4>
        <div style="background: #f0f9ff; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border: 1px solid #bfdbfe;">
          <p style="margin: 0.5rem 0; color: #1e40af; font-weight: bold; font-size: 1rem;">UPI ID:</p>
          <div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin: 0.5rem 0;">
            <span style="font-family: monospace; background: white; padding: 0.75rem; border-radius: 4px; border: 2px solid #3b82f6; color: #1e40af; font-weight: bold; font-size: 1rem;">${upiId}</span>
            <button id="copy-upi-btn" style="background: #3b82f6; color: white; border: none; padding: 0.75rem; border-radius: 4px; cursor: pointer; font-size: 0.9rem; font-weight: 600;">
              📋 Copy
            </button>
          </div>
          <p style="margin: 0.5rem 0; font-size: 1rem; color: #1e40af; font-weight: 600;"><strong>Amount:</strong> ₹${amount}</p>
          <p style="margin: 0.5rem 0; font-size: 0.95rem; color: #1e40af; font-weight: 500;"><strong>Note:</strong> ${note}</p>
        </div>
      </div>

      <div style="margin-bottom: 1.5rem;">
        <h4 style="margin-bottom: 1rem; color: #2d3748; font-weight: bold; font-size: 1.1rem;">Method 3: Try UPI Apps</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem;">
          <button id="phonepe-btn" 
                  style="background: #7c3aed; color: white; border: none; padding: 1rem; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 0.95rem; transition: all 0.2s;">
            📱 PhonePe
          </button>
          <button id="gpay-btn" 
                  style="background: #10b981; color: white; border: none; padding: 1rem; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 0.95rem; transition: all 0.2s;">
            💳 GPay
          </button>
          <button id="paytm-btn" 
                  style="background: #3b82f6; color: white; border: none; padding: 1rem; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 0.95rem; transition: all 0.2s;">
            💰 Paytm
          </button>
          <button id="any-upi-btn" 
                  style="background: #6b7280; color: white; border: none; padding: 1rem; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 0.95rem; transition: all 0.2s;">
            🔗 Other
          </button>
        </div>
        <button id="copy-payment-link-btn" 
                style="background: #f59e0b; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.9rem; margin-bottom: 0.75rem; width: 100%;">
          📋 Copy Payment Link (Works on Mobile)
        </button>
        <p style="font-size: 0.9rem; color: #6b7280; font-weight: 500;">
          If apps don't open, use the QR code or manual payment method above
        </p>
      </div>

      <div style="border-top: 2px solid #e2e8f0; padding-top: 1.5rem;">
        <div style="display: flex; gap: 1rem; justify-content: center; margin-bottom: 1rem;">
          <button id="cancel-btn" 
                  style="background: #e5e7eb; color: #374151; border: none; padding: 1rem 2rem; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 1rem;">
            Cancel
          </button>
          <button id="payment-done-btn" 
                  style="background: #10b981; color: white; border: none; padding: 1rem 2rem; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 1rem;">
            Payment Completed ✅
          </button>
        </div>
        <p style="font-size: 0.9rem; color: #6b7280; margin-top: 0.5rem; font-weight: 500;">
          Click "Payment Completed" after successful payment
        </p>
      </div>
    `
    
    modal.className = 'upi-modal'
    modal.appendChild(modalContent)
    document.body.appendChild(modal)
    
    // Add event listeners for buttons
    document.getElementById('copy-upi-btn').addEventListener('click', () => {
      copyToClipboard(upiId)
    })
    
    document.getElementById('phonepe-btn').addEventListener('click', () => {
      const phonePeUrl = `phonepe://pay?pa=${upiId}&pn=TeachWise&tn=${encodeURIComponent(note)}&am=${amount}&cu=INR`
      const webUrl = `https://phon.pe/ru_url?url=${encodeURIComponent(phonePeUrl)}`
      
      // Try to open PhonePe app first
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.src = phonePeUrl
      document.body.appendChild(iframe)
      
      setTimeout(() => {
        document.body.removeChild(iframe)
        // If app doesn't open, show instructions
        alert(`PhonePe link copied! You can also:\n1. Open PhonePe app manually\n2. Send ₹${amount} to ${upiId}\n3. Use note: ${note}`)
      }, 1000)
    })
    
    document.getElementById('gpay-btn').addEventListener('click', () => {
      const gpayUrl = `tez://upi/pay?pa=${upiId}&pn=TeachWise&tn=${encodeURIComponent(note)}&am=${amount}&cu=INR`
      
      // Try multiple methods for Google Pay
      const methods = [
        () => window.location.href = gpayUrl,
        () => window.open(gpayUrl, '_blank'),
        () => {
          const iframe = document.createElement('iframe')
          iframe.style.display = 'none'
          iframe.src = gpayUrl
          document.body.appendChild(iframe)
          setTimeout(() => document.body.removeChild(iframe), 1000)
        }
      ]
      
      // Try first method
      try {
        methods[0]()
      } catch (e) {
        methods[2]()
      }
      
      setTimeout(() => {
        alert(`Google Pay link activated! You can also:\n1. Open Google Pay app manually\n2. Send ₹${amount} to ${upiId}\n3. Use note: ${note}`)
      }, 1500)
    })
    
    document.getElementById('paytm-btn').addEventListener('click', () => {
      const paytmUrl = `paytmmp://pay?pa=${upiId}&pn=TeachWise&tn=${encodeURIComponent(note)}&am=${amount}&cu=INR`
      
      // Create a hidden link and click it
      const link = document.createElement('a')
      link.href = paytmUrl
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      setTimeout(() => {
        alert(`Paytm link activated! You can also:\n1. Open Paytm app manually\n2. Send ₹${amount} to ${upiId}\n3. Use note: ${note}`)
      }, 1000)
    })
    
    document.getElementById('any-upi-btn').addEventListener('click', () => {
      const upiUrl = `upi://pay?pa=${upiId}&pn=TeachWise&tn=${encodeURIComponent(note)}&am=${amount}&cu=INR`
      
      // Try generic UPI
      window.location.href = upiUrl
      
      setTimeout(() => {
        const fallbackMessage = `UPI apps should open automatically. If not:\n\n` +
          `Manual Payment Details:\n` +
          `• UPI ID: ${upiId}\n` +
          `• Amount: ₹${amount}\n` +
          `• Note: ${note}\n\n` +
          `Open any UPI app and send the payment manually.`
        alert(fallbackMessage)
      }, 2000)
    })
    
    document.getElementById('copy-payment-link-btn').addEventListener('click', () => {
      const upiUrl = `upi://pay?pa=${upiId}&pn=TeachWise&tn=${encodeURIComponent(note)}&am=${amount}&cu=INR`
      copyToClipboard(upiUrl)
      alert('Payment link copied! Paste it in any UPI app or browser on your mobile device.')
    })
    
    document.getElementById('cancel-btn').addEventListener('click', () => {
      modal.remove()
    })
    
    document.getElementById('payment-done-btn').addEventListener('click', () => {
      showPaymentConfirmationForm(amount, planName, credits)
      modal.remove()
    })
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove()
      }
    })
  }

  return (
    <main className="main-container">
      <header className="header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h1>Plans</h1>
            <p>Available features for the project.</p>
          </div>
          
          <Link href="/" style={{ 
            background: '#6b7280', 
            color: 'white', 
            padding: '0.75rem 1.5rem', 
            borderRadius: '8px', 
            textDecoration: 'none', 
            fontWeight: '600',
            fontSize: '0.9rem'
          }}>
            ← Back to TeachWise
          </Link>
        </div>

        {/* User Status Display */}
        {userStatus && (
          <div style={{
            background: userStatus.isSubscribed ? '#f0f9ff' : '#fef3c7',
            border: `2px solid ${userStatus.isSubscribed ? '#3b82f6' : '#f59e0b'}`,
            borderRadius: '12px',
            padding: '1.5rem',
            marginTop: '1rem',
            textAlign: 'center'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
              <div>
                <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', color: '#6b7280', fontWeight: '600' }}>
                  Account
                </p>
                <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', color: '#1f2937' }}>
                  {userStatus.email}
                </p>
              </div>
              
              <div>
                <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', color: '#6b7280', fontWeight: '600' }}>
                  Current Credits
                </p>
                <p style={{ 
                  margin: 0, 
                  fontSize: '1.5rem', 
                  fontWeight: 'bold', 
                  color: userStatus.credits > 0 ? '#10b981' : '#ef4444' 
                }}>
                  {userStatus.credits || 0}
                </p>
              </div>
              
              <div>
                <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', color: '#6b7280', fontWeight: '600' }}>
                  Status
                </p>
                <p style={{ 
                  margin: 0, 
                  fontSize: '1rem', 
                  fontWeight: 'bold',
                  color: userStatus.isSubscribed ? '#10b981' : (userStatus.credits > 0 ? '#f59e0b' : '#ef4444')
                }}>
                  {userStatus.isSubscribed 
                    ? '✅ Premium User' 
                    : userStatus.credits > 0 
                      ? '⚡ Trial Active' 
                      : '❌ Trial Expired'
                  }
                </p>
              </div>
            </div>
            
            {userStatus.credits > 0 && !userStatus.isSubscribed && (
              <p style={{ 
                margin: '1rem 0 0 0', 
                fontSize: '0.9rem', 
                color: '#92400e',
                fontWeight: '600'
              }}>
                💡 You have {Math.floor(userStatus.credits / 4)} lessons remaining (4 credits per lesson)
              </p>
            )}
          </div>
        )}
      </header>

      <section className="pricing">
        <div className="plans-container">
          
          {/* Basic Plan - 25 Credits for ₹100 */}
          <div className="plan">
            <div className="plan-header">
              <h3>Basic Plan</h3>
              <div className="plan-price">
                <span className="currency">₹</span>
                <span className="amount">100</span>
              </div>
              <p className="plan-subtitle">Perfect for getting started</p>
            </div>
            
            <div className="plan-features">
              <div className="credits-info">
                <span className="credits-number">100</span>
                <span className="credits-label">Credits</span>
              </div>
              
              <ul className="features-list">
                <li>✅ 25 Lesson Plans (4 credits each)</li>
                <li>✅ 25 Quizzes (4 credits each)</li>
                <li>✅ 25 Presentations (4 credits each)</li>
                <li>✅ No expiry</li>
                <li>✅ Full access to all features</li>
              </ul>
            </div>
            
            <button 
              className="plan-button"
              onClick={() => startUPIPayment(100, 100, 'Basic Plan')}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Get Basic Plan'}
            </button>
          </div>

          {/* Premium Plan - 250 Credits for ₹750 */}
          <div className="plan premium">
            <div className="popular-badge">Most Popular</div>
            <div className="plan-header">
              <h3>Premium Plan</h3>
              <div className="plan-price">
                <span className="currency">₹</span>
                <span className="amount">750</span>
              </div>
              <p className="plan-subtitle">Best value for educators</p>
            </div>
            
            <div className="plan-features">
              <div className="credits-info">
                <span className="credits-number">1000</span>
                <span className="credits-label">Credits</span>
              </div>
              
              <ul className="features-list">
                <li>✅ 250 Lesson Plans (4 credits each)</li>
                <li>✅ 250 Quizzes (4 credits each)</li>
                <li>✅ 250 Presentations (4 credits each)</li>
                <li>✅ No expiry</li>
                <li>✅ Full access to all features</li>
                <li>✅ Priority support</li>
              </ul>
              
              <div className="savings-badge">
                Save ₹250 compared to Basic Plan!
              </div>
            </div>
            
            <button 
              className="plan-button premium-button"
              onClick={() => startUPIPayment(750, 1000, 'Premium Plan')}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Get Premium Plan'}
            </button>
          </div>

        </div>
      </section>
      
      <style jsx>{`
        .main-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .header h1 {
          font-size: 2.5rem;
          font-weight: bold;
          color: #1a202c;
          margin-bottom: 0.5rem;
        }

        .header p {
          font-size: 1.1rem;
          color: #64748b;
        }

        .plans-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 2rem;
          max-width: 800px;
          margin: 0 auto;
        }

        .plan {
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 16px;
          padding: 2rem;
          position: relative;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }

        .plan:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 25px rgba(0, 0, 0, 0.1);
          border-color: #3b82f6;
        }

        .plan.premium {
          border-color: #8b5cf6;
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
        }

        .popular-badge {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
          color: white;
          padding: 0.5rem 1.5rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }

        .plan-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .plan-header h3 {
          font-size: 1.5rem;
          font-weight: bold;
          color: #1a202c;
          margin-bottom: 1rem;
        }

        .plan-price {
          display: flex;
          align-items: baseline;
          justify-content: center;
          margin-bottom: 0.5rem;
        }

        .currency {
          font-size: 1.2rem;
          color: #64748b;
          margin-right: 0.25rem;
        }

        .amount {
          font-size: 3rem;
          font-weight: bold;
          color: #1a202c;
        }

        .plan-subtitle {
          color: #64748b;
          font-size: 0.95rem;
        }

        .credits-info {
          text-align: center;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          padding: 1rem;
          border-radius: 12px;
          margin-bottom: 1.5rem;
        }

        .credits-number {
          display: block;
          font-size: 2.5rem;
          font-weight: bold;
          line-height: 1;
        }

        .credits-label {
          font-size: 0.9rem;
          opacity: 0.9;
        }

        .features-list {
          list-style: none;
          padding: 0;
          margin: 0 0 1.5rem 0;
        }

        .features-list li {
          padding: 0.5rem 0;
          color: #374151;
          font-size: 0.95rem;
        }

        .savings-badge {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 0.75rem;
          border-radius: 8px;
          text-align: center;
          font-weight: 600;
          font-size: 0.9rem;
          margin-top: 1rem;
        }

        .plan-button {
          width: 100%;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border: none;
          padding: 1rem 2rem;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .plan-button:hover:not(:disabled) {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          transform: translateY(-1px);
        }

        .plan-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .premium-button {
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
        }

        .premium-button:hover:not(:disabled) {
          background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
        }

        @media (max-width: 768px) {
          .main-container {
            padding: 1rem;
          }

          .plans-container {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .plan {
            padding: 1.5rem;
          }

          .amount {
            font-size: 2.5rem;
          }

          .credits-number {
            font-size: 2rem;
          }
        }
      `}</style>
    </main>
  )
}
