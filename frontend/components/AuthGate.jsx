// Enhanced auth gate component with improved UX

import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import SubscriptionModal from './SubscriptionModal'
import CreditsDisplay from './CreditsDisplay'
import CreditsPurchaseModal from './CreditsPurchaseModal'
import ForgotPasswordModal from './ForgotPasswordModal'

export default function AuthGate({ children }) {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [trialStatus, setTrialStatus] = useState(null)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  const [showCreditsPurchaseModal, setShowCreditsPurchaseModal] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lowCreditsWarning, setLowCreditsWarning] = useState(false)
  const [lastUserEmail, setLastUserEmail] = useState(null) // Track email after logout

  // Check trial status with better error handling
  const checkTrialStatus = async (userEmail) => {
    try {
      setError('')
      const response = await fetch(`/api/trial-status?email=${encodeURIComponent(userEmail)}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      setTrialStatus(data)
      
      if (data.trialExpired && !data.isSubscribed) {
        // Automatically log out when trial expires after 20 minutes
        setLastUserEmail(userEmail) // Store email before logout
        localStorage.removeItem('teachwise_user')
        setUser(null)
        setTrialStatus(null)
        // Redirect to pricing page instead of showing subscription modal
        router.push('/pricing')
        console.log('Trial expired after 20 minutes - user automatically logged out and redirected to pricing')
      }
    } catch (err) {
      console.error('Error checking trial status:', err)
      setError('Unable to check trial status. Please refresh the page.')
    }
  }

  // Load user from localStorage on mount with better error handling
  useEffect(() => {
    const init = async () => {
      try {
        const savedUser = localStorage.getItem('teachwise_user')
        if (savedUser) {
          const userData = JSON.parse(savedUser)
          setUser(userData)
          await checkTrialStatus(userData.email)
        }
      } catch (err) {
        console.error('Error loading user session:', err)
        localStorage.removeItem('teachwise_user') // Clear corrupted data
        setError('Session data corrupted. Please sign in again.')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  // Set up periodic trial status checking with better error handling
  useEffect(() => {
    if (!user || !trialStatus || trialStatus.isSubscribed) return

    const interval = setInterval(async () => {
      await checkTrialStatus(user.email)
    }, 30000) // Check every 30 seconds for immediate logout when trial expires

    // Listen for payment success to immediately refresh status
    const handlePaymentSuccess = async () => {
      console.log('Payment success detected, refreshing trial status...');
      await checkTrialStatus(user.email);
    };
    
    window.addEventListener('payment-success', handlePaymentSuccess);

    return () => {
      clearInterval(interval);
      window.removeEventListener('payment-success', handlePaymentSuccess);
    };
  }, [user, trialStatus])

  // Listen for forgot password event
  useEffect(() => {
    const handleOpenForgotPassword = () => {
      setShowForgotPassword(true)
    }
    
    window.addEventListener('open-forgot-password', handleOpenForgotPassword)
    return () => window.removeEventListener('open-forgot-password', handleOpenForgotPassword)
  }, [])

  const handleSignOut = () => {
    localStorage.removeItem('teachwise_user')
    setUser(null)
    setTrialStatus(null)
    setLastUserEmail(null) // Clear stored email on manual sign out
    setError('')
  }

  // Enhanced loading state
  if (loading) {
    return (
      <div className="auth-center">
        <div className="loading-container">
          <div className="loading-spinner-large" />
          <p className="loading-text">Initializing TeachWise...</p>
          <div className="loading-steps">
            <div className="step active">Checking session</div>
            <div className="step">Loading preferences</div>
            <div className="step">Verifying trial status</div>
          </div>
        </div>
      </div>
    )
  }

  // Enhanced error state
  if (error) {
    return (
      <div className="auth-center">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h3>Connection Issue</h3>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="retry-button"
          >
            Refresh Page
          </button>
        </div>
      </div>
    )
  }

  // Enhanced authenticated state with better trial info
  if (user) {
    return (
      <>
        <div className="auth-header">
          <div className="user-info">
            <span className="user-badge">{user.email}</span>
            {trialStatus && (
              <span className={`trial-info ${getTrialStatusClass(trialStatus)}`}>
                {trialStatus.isSubscribed 
                  ? (
                      <span className="subscription-status">
                        <span className="status-icon">✅</span>
                        Subscribed (₹{trialStatus.paidAmount})
                      </span>
                    )
                  : (
                      <span className="trial-status">
                        <span className="status-icon">⚡</span>
                        {trialStatus.creditsLeft > 0 ? (
                          <>
                            {trialStatus.creditsLeft} credits 
                            {trialStatus.minutesLeft > 0 && (
                              <span className="time-remaining"> • {trialStatus.minutesLeft} min left</span>
                            )}
                            {trialStatus.creditsLeft <= 12 && (
                              <span className="urgent-indicator"> • Running low!</span>
                            )}
                          </>
                        ) : (
                          <span className="add-credits-message">Add Credits to Continue</span>
                        )}
                      </span>
                    )
                }
              </span>
            )}
          </div>
          <div className="header-actions">
            <button onClick={handleSignOut} className="signout-btn">
              <span className="btn-icon">👋</span>
              Sign out
            </button>
          </div>
        </div>
        
        {/* Credits Display */}
        <CreditsDisplay 
          onPurchaseClick={() => setShowCreditsPurchaseModal(true)}
          onLowCredits={(credits) => setLowCreditsWarning(credits <= 5)}
        />
        
        {/* Low Credits Warning */}
        {lowCreditsWarning && (
          <div className="low-credits-banner">
            <span className="warning-icon">⚡</span>
            <span className="warning-text">
              Running low on credits! Get more to continue using AI tools.
            </span>
            <button 
              className="get-credits-btn"
              onClick={() => setShowCreditsPurchaseModal(true)}
            >
              Get Credits
            </button>
          </div>
        )}
        
        {children}
        
        {/* Credits Purchase Modal */}
        <CreditsPurchaseModal
          isOpen={showCreditsPurchaseModal}
          onClose={() => setShowCreditsPurchaseModal(false)}
          onPurchaseSuccess={() => {
            setShowCreditsPurchaseModal(false)
            setLowCreditsWarning(false)
            // Credits will be automatically refreshed by CreditsDisplay component
          }}
        />
        
        {/* Forgot Password Modal */}
        {showForgotPassword && (
          <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} />
        )}
      </>
    )
  }

  return (
    <>
      <AuthScreen 
        onSignIn={setUser} 
        onTrialCheck={checkTrialStatus}
        hiddenByForgotPassword={showForgotPassword}
      />
      {showForgotPassword && (
        <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} />
      )}
    </>
  )
}

// Helper function to determine trial status styling
function getTrialStatusClass(trialStatus) {
  if (trialStatus.isSubscribed) return 'subscribed'
  if (trialStatus.creditsLeft === 0) return 'trial-critical'
  if (trialStatus.creditsLeft <= 12) return 'trial-warning'
  return 'trial-active'
}

function AuthScreen({ onSignIn, onTrialCheck, hiddenByForgotPassword }) {
  const [showAuthForm, setShowAuthForm] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const [touchedFields, setTouchedFields] = useState({})

  // Real-time validation
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePassword = (password) => {
    const errors = []
    if (password.length < 8) errors.push('At least 8 characters')
    if (!/(?=.*[a-z])/.test(password)) errors.push('One lowercase letter')
    if (!/(?=.*[A-Z])/.test(password)) errors.push('One uppercase letter')
    if (!/(?=.*\d)/.test(password)) errors.push('One number')
    if (!/(?=.*[@$!%*?&])/.test(password)) errors.push('One special character')
    return errors
  }

  // Real-time form validation
  useEffect(() => {
    const errors = {}
    
    if (touchedFields.email && email) {
      if (!validateEmail(email.trim())) {
        errors.email = 'Please enter a valid email address'
      }
    }
    
    if (touchedFields.password && password) {
      if (isSignUp) {
        const passwordErrors = validatePassword(password)
        if (passwordErrors.length > 0) {
          errors.password = passwordErrors.join(', ')
        }
      } else if (password.length < 6) {
        errors.password = 'Password must be at least 6 characters'
      }
    }
    
    if (touchedFields.confirmPassword && isSignUp && confirmPassword) {
      if (password !== confirmPassword) {
        errors.confirmPassword = 'Passwords do not match'
      }
    }
    
    setFormErrors(errors)
  }, [email, password, confirmPassword, isSignUp, touchedFields])

  const handleFieldBlur = (fieldName) => {
    setTouchedFields(prev => ({ ...prev, [fieldName]: true }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')

    // Mark all fields as touched for validation
    setTouchedFields({
      email: true,
      password: true,
      confirmPassword: isSignUp
    })

    // Final validation
    if (!email.trim()) {
      setMessage('Email is required')
      return
    }
    
    if (!validateEmail(email.trim())) {
      setMessage('Please enter a valid email address')
      return
    }

    if (!password.trim()) {
      setMessage('Password is required')
      return
    }

    if (isSignUp) {
      const passwordErrors = validatePassword(password)
      if (passwordErrors.length > 0) {
        setMessage(`Password requirements: ${passwordErrors.join(', ')}`)
        return
      }

      if (!confirmPassword.trim()) {
        setMessage('Please confirm your password')
        return
      }

      if (password !== confirmPassword) {
        setMessage('Passwords do not match')
        return
      }
    } else {
      if (password.length < 6) {
        setMessage('Password must be at least 6 characters')
        return
      }
    }
    
    setPending(true)
    
    try {
      const userData = { email: email.trim().toLowerCase() }
      
      if (isSignUp) {
        const existingUsers = JSON.parse(localStorage.getItem('teachwise_users') || '{}')
        if (existingUsers[userData.email]) {
          setMessage('An account with this email already exists. Please sign in instead.')
          setPending(false)
          return
        }
        existingUsers[userData.email] = {
          email: userData.email,
          createdAt: new Date().toISOString(),
          password: password
        }
        localStorage.setItem('teachwise_users', JSON.stringify(existingUsers))
        setMessage('🎉 Account created successfully! Welcome to TeachWise!')
        
        // Small delay to show success message
        setTimeout(() => {
          localStorage.setItem('teachwise_user', JSON.stringify(userData))
          onSignIn(userData)
          onTrialCheck(userData.email)
        }, 1500)
      } else {
        const existingUsers = JSON.parse(localStorage.getItem('teachwise_users') || '{}')
        const user = existingUsers[userData.email]
        if (!user) {
          setMessage('No account found with this email. Please sign up first.')
          setPending(false)
          return
        }
        if (user.password !== password) {
          setMessage('Incorrect password. Please try again.')
          setPending(false)
          return
        }
        
        setMessage('✅ Welcome back! Signing you in...')
        
        // Small delay to show success message
        setTimeout(() => {
          localStorage.setItem('teachwise_user', JSON.stringify(userData))
          onSignIn(userData)
          onTrialCheck(userData.email)
        }, 1000)
      }
    } catch (error) {
      setMessage('❌ An unexpected error occurred. Please try again.')
      console.error('Auth error:', error)
      setPending(false)
    }
  }

  const getPasswordStrength = (password) => {
    const requirements = [
      password.length >= 8,
      /(?=.*[a-z])/.test(password),
      /(?=.*[A-Z])/.test(password),
      /(?=.*\d)/.test(password),
      /(?=.*[@$!%*?&])/.test(password)
    ]
    const strength = requirements.filter(Boolean).length
    
    if (strength === 0) return { label: '', color: '', width: '0%' }
    if (strength <= 2) return { label: 'Weak', color: '#e53e3e', width: '33%' }
    if (strength <= 4) return { label: 'Good', color: '#dd6b20', width: '66%' }
    return { label: 'Strong', color: '#38a169', width: '100%' }
  }

  const passwordStrength = isSignUp ? getPasswordStrength(password) : null

  return (
    <div className="auth-center">
      <div className="hero-section">
        <div className="hero-content">
          <div className="hero-icon">🎓</div>
          <h1 className="hero-title">Introducing TeachWise AI</h1>
          <p className="hero-subtitle">The intelligent teaching assistant that transforms how educators create lesson plans, quizzes, and presentations.</p>
          
          <div className="hero-features">
            <div className="feature-item">
              <span className="feature-icon">⚡</span>
              <span>Generate content in seconds</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🎯</span>
              <span>Personalized for your grade level</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📊</span>
              <span>Export to PDF & PowerPoint</span>
            </div>
          </div>
          
          <button 
            className="hero-cta-button"
            onClick={() => setShowAuthForm(true)}
          >
            Get Started
          </button>
          
          <p className="trial-notice">
            ✨ 100 credits trial - valid for 20 minutes • No credit card required
          </p>
        </div>
      </div>
      
      {showAuthForm && !hiddenByForgotPassword && (
        <AuthModal 
          onClose={() => setShowAuthForm(false)} 
          onSignIn={onSignIn} 
          onTrialCheck={onTrialCheck} 
        />
      )}
    </div>
  )
}

function AuthModal({ onClose, onSignIn, onTrialCheck }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const [touchedFields, setTouchedFields] = useState({})

  // Real-time validation
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePassword = (password) => {
    const errors = []
    if (password.length < 8) errors.push('At least 8 characters')
    if (!/(?=.*[a-z])/.test(password)) errors.push('One lowercase letter')
    if (!/(?=.*[A-Z])/.test(password)) errors.push('One uppercase letter')
    if (!/(?=.*\d)/.test(password)) errors.push('One number')
    if (!/(?=.*[@$!%*?&])/.test(password)) errors.push('One special character')
    return errors
  }

  // Real-time form validation
  useEffect(() => {
    const errors = {}
    
    if (touchedFields.email && email) {
      if (!validateEmail(email.trim())) {
        errors.email = 'Please enter a valid email address'
      }
    }
    
    if (touchedFields.password && password) {
      if (isSignUp) {
        const passwordErrors = validatePassword(password)
        if (passwordErrors.length > 0) {
          errors.password = passwordErrors.join(', ')
        }
      } else if (password.length < 6) {
        errors.password = 'Password must be at least 6 characters'
      }
    }
    
    if (touchedFields.confirmPassword && isSignUp && confirmPassword) {
      if (password !== confirmPassword) {
        errors.confirmPassword = 'Passwords do not match'
      }
    }
    
    setFormErrors(errors)
  }, [email, password, confirmPassword, isSignUp, touchedFields])

  const handleFieldBlur = (fieldName) => {
    setTouchedFields(prev => ({ ...prev, [fieldName]: true }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')

    // Mark all fields as touched for validation
    setTouchedFields({
      email: true,
      password: true,
      confirmPassword: isSignUp
    })

    // Final validation
    if (!email.trim()) {
      setMessage('Email is required')
      return
    }
    
    if (!validateEmail(email.trim())) {
      setMessage('Please enter a valid email address')
      return
    }

    if (!password.trim()) {
      setMessage('Password is required')
      return
    }

    if (isSignUp) {
      const passwordErrors = validatePassword(password)
      if (passwordErrors.length > 0) {
        setMessage(`Password requirements: ${passwordErrors.join(', ')}`)
        return
      }

      if (!confirmPassword.trim()) {
        setMessage('Please confirm your password')
        return
      }

      if (password !== confirmPassword) {
        setMessage('Passwords do not match')
        return
      }
    } else {
      if (password.length < 6) {
        setMessage('Password must be at least 6 characters')
        return
      }
    }
    
    setPending(true)
    
    try {
      const userData = { email: email.trim().toLowerCase() }
      
      if (isSignUp) {
        const existingUsers = JSON.parse(localStorage.getItem('teachwise_users') || '{}')
        if (existingUsers[userData.email]) {
          setMessage('An account with this email already exists. Please sign in instead.')
          setPending(false)
          return
        }
        existingUsers[userData.email] = {
          email: userData.email,
          createdAt: new Date().toISOString(),
          password: password
        }
        localStorage.setItem('teachwise_users', JSON.stringify(existingUsers))
        setMessage('🎉 Account created successfully! Welcome to TeachWise!')
        
        setTimeout(() => {
          localStorage.setItem('teachwise_user', JSON.stringify(userData))
          onSignIn(userData)
          onTrialCheck(userData.email)
          onClose()
        }, 1500)
      } else {
        const existingUsers = JSON.parse(localStorage.getItem('teachwise_users') || '{}')
        const user = existingUsers[userData.email]
        if (!user) {
          setMessage('No account found with this email. Please sign up first.')
          setPending(false)
          return
        }
        if (user.password !== password) {
          setMessage('Incorrect password. Please try again.')
          setPending(false)
          return
        }
        
        setMessage('✅ Welcome back! Signing you in...')
        
        setTimeout(() => {
          localStorage.setItem('teachwise_user', JSON.stringify(userData))
          onSignIn(userData)
          onTrialCheck(userData.email)
          onClose()
        }, 1000)
      }
    } catch (error) {
      setMessage('❌ An unexpected error occurred. Please try again.')
      console.error('Auth error:', error)
      setPending(false)
    }
  }

  const getPasswordStrength = (password) => {
    const requirements = [
      password.length >= 8,
      /(?=.*[a-z])/.test(password),
      /(?=.*[A-Z])/.test(password),
      /(?=.*\d)/.test(password),
      /(?=.*[@$!%*?&])/.test(password)
    ]
    const strength = requirements.filter(Boolean).length
    
    if (strength === 0) return { label: '', color: '', width: '0%' }
    if (strength <= 2) return { label: 'Weak', color: '#e53e3e', width: '33%' }
    if (strength <= 4) return { label: 'Good', color: '#dd6b20', width: '66%' }
    return { label: 'Strong', color: '#38a169', width: '100%' }
  }

  const passwordStrength = isSignUp ? getPasswordStrength(password) : null

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isSignUp ? 'Create Your Account' : 'Welcome Back'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-field">
            <label htmlFor="email">Email Address</label>
            <div className="input-container">
              <input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => handleFieldBlur('email')}
                required
                className={formErrors.email ? 'error' : touchedFields.email && !formErrors.email ? 'success' : ''}
              />
              {touchedFields.email && !formErrors.email && email && (
                <span className="input-success-icon">✓</span>
              )}
            </div>
            {formErrors.email && (
              <span className="field-error">{formErrors.email}</span>
            )}
          </div>
          
          <div className="form-field">
            <label htmlFor="password">Password</label>
            <div className="password-input-container">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder={isSignUp ? "Create a strong password" : "Enter your password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => handleFieldBlur('password')}
                required
                className={formErrors.password ? 'error' : touchedFields.password && !formErrors.password && password ? 'success' : ''}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? '👁️' : '🙈'}
              </button>
            </div>
            
            {isSignUp && password && (
              <div className="password-strength">
                <div className="strength-bar">
                  <div 
                    className="strength-fill" 
                    style={{ 
                      width: passwordStrength.width, 
                      backgroundColor: passwordStrength.color 
                    }}
                  />
                </div>
                <span className="strength-label" style={{ color: passwordStrength.color }}>
                  {passwordStrength.label}
                </span>
              </div>
            )}
            
            {formErrors.password && (
              <span className="field-error">{formErrors.password}</span>
            )}
          </div>

          {isSignUp && (
            <div className="form-field">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="password-input-container">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => handleFieldBlur('confirmPassword')}
                  required
                  className={formErrors.confirmPassword ? 'error' : touchedFields.confirmPassword && !formErrors.confirmPassword && confirmPassword ? 'success' : ''}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPassword ? '👁️' : '🙈'}
                </button>
              </div>
              {formErrors.confirmPassword && (
                <span className="field-error">{formErrors.confirmPassword}</span>
              )}
            </div>
          )}

          <button type="submit" className="auth-submit-btn" disabled={pending || Object.keys(formErrors).length > 0}>
            {pending ? (
              <>
                <div className="loading-spinner-small" />
                {isSignUp ? 'Creating Account...' : 'Signing In...'}
              </>
            ) : (
              <>
                {isSignUp ? 'Start Trial' : 'Sign In'}
              </>
            )}
          </button>
        </form>
        
        {message && (
          <div className={`auth-message ${
            message.includes('🎉') || message.includes('✅') ? 'success' : 
            message.includes('❌') ? 'error' : 'info'
          }`}>
            {message}
          </div>
        )}
        
        <div className="auth-toggle">
          <p>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button 
              type="button" 
              onClick={() => {
                setIsSignUp(!isSignUp)
                setMessage('')
                setFormErrors({})
                setTouchedFields({})
                setConfirmPassword('')
                setShowPassword(false)
                setShowConfirmPassword(false)
              }}
              className="toggle-auth-btn"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
          {!isSignUp && (
            <p style={{ marginTop: '10px' }}>
              <button 
                type="button" 
                onClick={() => window.dispatchEvent(new Event('open-forgot-password'))}
                className="forgot-password-btn"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#4F46E5',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontSize: '14px',
                  padding: 0
                }}
              >
                Forgot Password?
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
