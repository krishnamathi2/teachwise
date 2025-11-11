import { useState, useEffect } from 'react';
import { usePayment } from '../hooks/usePayment';

const CreditsPurchaseModal = ({ isOpen, onClose, onPurchaseSuccess }) => {
  const [packages, setPackages] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('packages'); // 'packages' or 'subscription'
  const [error, setError] = useState(null);
  const [paymentConfig, setPaymentConfig] = useState(null);

  const {
    loading: paymentLoading,
    error: paymentError,
    getPaymentConfig,
    purchaseCreditsWithRazorpay
  } = usePayment();

  useEffect(() => {
    if (isOpen) {
      fetchPurchaseOptions();
      loadPaymentConfig();
    }
  }, [isOpen]);

  const loadPaymentConfig = async () => {
    const config = await getPaymentConfig();
    setPaymentConfig(config);
  };

  const fetchPurchaseOptions = async () => {
    try {
      setLoading(true);
      
      // Fetch credit packages
      const packagesResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND}/credits/packages`);
      const packagesData = await packagesResponse.json();
      
      // Fetch subscription plans
      const plansResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND}/credits/plans`);
      const plansData = await plansResponse.json();

      if (packagesResponse.ok) {
        setPackages(packagesData.packages || []);
      }
      
      if (plansResponse.ok) {
        setPlans(plansData.plans || []);
      }
    } catch (err) {
      console.error('Error fetching purchase options:', err);
      setError('Failed to load purchase options');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchasePackage = async (packageInfo) => {
    try {
      setError(null);
      
      if (paymentConfig?.razorpay?.enabled) {
        await purchaseCreditsWithRazorpay(packageInfo.id);
      } else {
        setError('Razorpay payment is not available');
      }
    } catch (err) {
      console.error('Purchase error:', err);
      setError(err.message);
    }
  };

  const handleSubscribe = async (plan) => {
    try {
      setError(null);
      // Subscription temporarily disabled - only Razorpay one-time purchases available
      setError('Subscriptions are temporarily unavailable. Please purchase credit packages instead.');
    } catch (err) {
      console.error('Subscription error:', err);
      setError(err.message);
    }
  };

  const getValueColor = (tier) => {
    switch (tier) {
      case 'basic': return '#3b82f6';
      case 'pro': return '#8b5cf6';
      case 'enterprise': return '#f59e0b';
      default: return '#64748b';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>💰 Get More Credits</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="tab-navigation">
          <button 
            className={`tab-button ${activeTab === 'packages' ? 'active' : ''}`}
            onClick={() => setActiveTab('packages')}
          >
            🎯 Credit Packages
          </button>
          <button 
            className={`tab-button ${activeTab === 'subscription' ? 'active' : ''}`}
            onClick={() => setActiveTab('subscription')}
          >
            🔄 Monthly Plans
          </button>
        </div>

        {(error || paymentError) && (
          <div className="error-banner">
            <span className="error-icon">⚠️</span>
            <span>{error || paymentError}</span>
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        <div className="modal-body">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading purchase options...</p>
            </div>
          ) : (
            <>
              {activeTab === 'packages' && (
                <div className="packages-section">
                  <div className="section-header">
                    <h3>💎 One-time Credit Packages</h3>
                    <p>Perfect for occasional use. Credits never expire!</p>
                  </div>
                  
                  <div className="packages-grid">
                    {packages.map(pkg => (
                      <div key={pkg.id} className="package-card">
                        <div className="package-header">
                          <h4>{pkg.name}</h4>
                          <div className="credits-amount">{pkg.credits} Credits</div>
                        </div>
                        
                        <div className="package-pricing">
                          <div className="price">
                            <span className="currency">$</span>
                            <span className="amount">{pkg.price_usd}</span>
                          </div>
                          <div className="price-per-credit">
                            ${(pkg.price_usd / pkg.credits).toFixed(3)} per credit
                          </div>
                        </div>

                        <div className="package-features">
                          <div className="feature">✅ Never expires</div>
                          <div className="feature">⚡ Instant activation</div>
                          <div className="feature">🔄 Works with all tools</div>
                        </div>

                        <div className="payment-buttons">
                          {paymentConfig?.razorpay?.enabled && (
                            <button 
                              className="purchase-button razorpay"
                              onClick={() => handlePurchasePackage(pkg)}
                              disabled={paymentLoading}
                            >
                              {paymentLoading ? '⏳ Processing...' : `💰 Pay ₹${pkg.price_inr}`}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'subscription' && (
                <div className="subscription-section">
                  <div className="section-header">
                    <h3>📅 Monthly Subscription Plans</h3>
                    <p>Best value for regular users. Credits reset monthly!</p>
                  </div>
                  
                  <div className="plans-grid">
                    {plans.map(plan => (
                      <div 
                        key={plan.id} 
                        className={`plan-card ${plan.tier === 'pro' ? 'featured' : ''}`}
                      >
                        {plan.tier === 'pro' && (
                          <div className="featured-badge">🔥 Most Popular</div>
                        )}
                        
                        <div className="plan-header">
                          <h4 style={{ color: getValueColor(plan.tier) }}>
                            {plan.name}
                          </h4>
                          <div className="plan-pricing">
                            <span className="price">
                              <span className="currency">$</span>
                              <span className="amount">{plan.price_usd}</span>
                              <span className="period">/month</span>
                            </span>
                          </div>
                        </div>

                        <div className="plan-credits">
                          <div className="credits-per-month">
                            {plan.monthly_credits === 999999 ? 'Unlimited' : plan.monthly_credits} 
                            {plan.monthly_credits !== 999999 && ' credits/month'}
                          </div>
                          {plan.monthly_credits !== 999999 && (
                            <div className="credits-value">
                              ${(plan.price_usd / plan.monthly_credits).toFixed(3)} per credit
                            </div>
                          )}
                        </div>

                        <div className="plan-features">
                          {JSON.parse(plan.features || '[]').map((feature, index) => (
                            <div key={index} className="feature">✅ {feature}</div>
                          ))}
                        </div>

                        <button 
                          className={`subscribe-button ${plan.tier === 'pro' ? 'featured' : ''}`}
                          onClick={() => handleSubscribe(plan)}
                          disabled={purchasing}
                        >
                          {purchasing ? 'Processing...' : `Subscribe to ${plan.name}`}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          <div className="security-info">
            🔒 Secure payment powered by Razorpay • 30-day money-back guarantee
          </div>
        </div>

        <style jsx>{`
          .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(6, 10, 15, 0.88);
            backdrop-filter: blur(8px) saturate(120%);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 1rem;
          }

          .modal-content {
            background: linear-gradient(180deg, #0b1220 0%, #0f1724 100%);
            border-radius: 16px;
            max-width: 900px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 24px 80px rgba(2,6,23,0.7);
            border: 1px solid rgba(255,255,255,0.03);
            color: #e6eef8;
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.4rem 1.8rem;
            border-bottom: 1px solid rgba(255,255,255,0.03);
            background: linear-gradient(180deg, rgba(255,255,255,0.02), transparent);
          }

          .modal-header h2 {
            margin: 0;
            font-size: 1.3rem;
            color: #e6eef8;
            font-weight: 700;
          }

          .close-button {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #9fb3c8;
            width: 36px;
            height: 36px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.12s ease;
          }

          .close-button:hover {
            background: rgba(255,255,255,0.02);
            color: #ffffff;
          }

          .tab-navigation {
            display: flex;
            border-bottom: 1px solid rgba(255,255,255,0.03);
          }

          .tab-button {
            flex: 1;
            padding: 0.9rem 1.5rem;
            background: none;
            border: none;
            font-size: 0.9rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.12s ease;
            color: #9fb3c8;
            border-bottom: 3px solid transparent;
          }

          .tab-button.active {
            color: #06d6a0;
            border-bottom-color: #06d6a0;
            background: linear-gradient(to bottom, transparent, rgba(6, 214, 160, 0.04));
          }

          .tab-button:hover:not(.active) {
            background: rgba(255,255,255,0.01);
            color: #e6eef8;
          }

          .error-banner {
            background: rgba(220,38,38,0.08);
            color: #ffb3b3;
            padding: 0.9rem 1.5rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            border-bottom: 1px solid rgba(220,38,38,0.15);
            font-size: 0.85rem;
          }

          .error-banner button {
            background: none;
            border: none;
            color: #ffb3b3;
            cursor: pointer;
            font-size: 1.1rem;
            margin-left: auto;
          }

          .modal-body {
            padding: 1.5rem 1.8rem;
          }

          .loading-state {
            text-align: center;
            padding: 3rem;
          }

          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid rgba(255,255,255,0.04);
            border-top: 4px solid #06d6a0;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
          }

          .section-header {
            text-align: center;
            margin-bottom: 1.5rem;
          }

          .section-header h3 {
            margin: 0 0 0.4rem 0;
            font-size: 1.2rem;
            color: #e6eef8;
          }

          .section-header p {
            margin: 0;
            color: #a8c0cf;
            font-size: 0.9rem;
          }

          .packages-grid, .plans-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 1.2rem;
          }

          .package-card, .plan-card {
            background: rgba(255,255,255,0.01);
            border: 1px solid rgba(255,255,255,0.06);
            border-radius: 12px;
            padding: 1.3rem;
            transition: all 0.14s ease;
            position: relative;
          }

          .package-card:hover, .plan-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 30px rgba(6,178,160,0.08);
            border-color: rgba(6,178,160,0.4);
            background: rgba(255,255,255,0.015);
          }

          .plan-card.featured {
            border-color: rgba(6,178,160,0.5);
            background: rgba(6,178,160,0.02);
          }

          .featured-badge {
            position: absolute;
            top: -10px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(90deg, #06b6d4 0%, #06d6a0 100%);
            color: #022b25;
            padding: 0.4rem 0.9rem;
            border-radius: 8px;
            font-size: 0.75rem;
            font-weight: 700;
          }

          .package-header h4, .plan-header h4 {
            margin: 0 0 0.4rem 0;
            font-size: 1.1rem;
            color: #e6eef8;
          }

          .credits-amount {
            font-size: 1.6rem;
            font-weight: bold;
            color: #06d6a0;
            margin-bottom: 0.8rem;
          }

          .package-pricing, .plan-pricing {
            margin-bottom: 1.2rem;
          }

          .price {
            display: flex;
            align-items: baseline;
            gap: 0.25rem;
            margin-bottom: 0.25rem;
          }

          .currency {
            font-size: 0.9rem;
            color: #a8c0cf;
          }

          .amount {
            font-size: 1.8rem;
            font-weight: bold;
            color: #e6eef8;
          }

          .period {
            font-size: 0.9rem;
            color: #a8c0cf;
          }

          .price-per-credit, .credits-value {
            font-size: 0.8rem;
            color: #9fb3c8;
          }

          .credits-per-month {
            font-size: 1.3rem;
            font-weight: bold;
            color: #06d6a0;
            margin-bottom: 0.25rem;
          }

          .package-features, .plan-features {
            margin-bottom: 1.2rem;
          }

          .feature {
            font-size: 0.85rem;
            color: #a8c0cf;
            margin-bottom: 0.4rem;
          }

          .payment-buttons {
            display: flex;
            gap: 0.5rem;
            flex-direction: column;
          }

          .purchase-button, .subscribe-button {
            width: 100%;
            background: linear-gradient(90deg, #06b6d4 0%, #06d6a0 100%);
            color: #022b25;
            border: none;
            padding: 0.7rem 1.3rem;
            border-radius: 8px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.14s ease;
            box-shadow: 0 6px 18px rgba(6,178,160,0.12);
          }

          .purchase-button.razorpay {
            background: linear-gradient(90deg, #06b6d4 0%, #06d6a0 100%);
          }

          .subscribe-button.featured {
            background: linear-gradient(90deg, #06b6d4 0%, #06d6a0 100%);
          }

          .purchase-button:hover, .subscribe-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(6,178,160,0.16);
            filter: brightness(1.03);
          }

          .subscribe-button.featured:hover {
            box-shadow: 0 10px 30px rgba(6,178,160,0.16);
          }

          .purchase-button:disabled, .subscribe-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
          }

          .modal-footer {
            background: rgba(255,255,255,0.01);
            padding: 1rem 1.8rem;
            text-align: center;
            border-radius: 0 0 16px 16px;
          }

          .security-info {
            font-size: 0.8rem;
            color: #9fb3c8;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          @media (max-width: 768px) {
            .modal-content {
              margin: 0;
              border-radius: 16px 16px 0 0;
              max-height: 95vh;
            }

            .modal-header, .modal-body, .modal-footer {
              padding: 1rem;
            }

            .tab-button {
              padding: 0.75rem 1rem;
              font-size: 0.9rem;
            }

            .packages-grid, .plans-grid {
              grid-template-columns: 1fr;
              gap: 1rem;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default CreditsPurchaseModal;