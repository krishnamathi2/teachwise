import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';

const CreditsDisplay = ({ onPurchaseClick, onLowCredits }) => {
  const router = useRouter();
  const [creditsInfo, setCreditsInfo] = useState({
    credits: 0,
    tier: 'trial',
    tierInfo: {},
    creditCosts: {},
    minutesLeft: 0,
    isTrialUser: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const fetchCreditsInfo = async () => {
    try {
      setLoading(true);
      
      // Get user email from localStorage
      const savedUser = localStorage.getItem('teachwise_user');
      if (!savedUser) {
        throw new Error('User not authenticated');
      }
      
      const userData = JSON.parse(savedUser);
      const email = userData.email;

      // Fetch from trial-status endpoint
      const response = await fetch(`/api/trial-status?email=${encodeURIComponent(email)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch credits');
      }

      // Transform trial status data to credits info format
      setCreditsInfo({
        credits: data.credits || data.creditsLeft || 0,
        tier: data.isSubscribed ? 'paid' : 'trial',
        tierInfo: {
          name: data.isSubscribed ? 'Paid User' : 'Trial User',
          creditsPerPeriod: data.isSubscribed ? 'Unlimited' : 100
        },
        creditCosts: {
          lesson_plan: 4,
          quiz: 4,
          presentation: 4,
          course: 4
        },
        minutesLeft: data.minutesLeft || 0,
        isTrialUser: !data.isSubscribed
      });
      
      // Trigger low credits warning if needed
      const credits = data.credits || data.creditsLeft || 0;
      if (credits <= 12 && onLowCredits) {
        onLowCredits(credits);
      }
    } catch (err) {
      console.error('Error fetching credits:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreditsInfo();
    
    // Refresh credits every 30 seconds
    const interval = setInterval(fetchCreditsInfo, 30000);
    
    // Listen for payment success event to refresh immediately
    const handlePaymentSuccess = () => {
      console.log('Payment success detected, refreshing credits...');
      fetchCreditsInfo();
    };
    
    const handleCreditsUpdated = () => {
      console.log('Credits updated event detected, refreshing...');
      fetchCreditsInfo();
    };
    
    window.addEventListener('payment-success', handlePaymentSuccess);
    window.addEventListener('credits-updated', handleCreditsUpdated);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('payment-success', handlePaymentSuccess);
      window.removeEventListener('credits-updated', handleCreditsUpdated);
    };
  }, []);

  const getCreditsColor = (credits) => {
    if (credits <= 5) return '#ef4444'; // red
    if (credits <= 15) return '#f59e0b'; // amber
    return '#10b981'; // green
  };

  const getTierColor = (tier) => {
    switch (tier) {
      case 'trial': return '#6b7280';
      case 'basic': return '#3b82f6';
      case 'pro': return '#8b5cf6';
      case 'enterprise': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getTierIcon = (tier) => {
    switch (tier) {
      case 'trial': return '⏱️';
      case 'basic': return '⭐';
      case 'pro': return '💎';
      case 'enterprise': return '👑';
      default: return '⏱️';
    }
  };

  if (loading) {
    return (
      <div className="credits-display loading">
        <div className="credits-skeleton">
          <div className="skeleton-text"></div>
          <div className="skeleton-number"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="credits-display error">
        <span className="error-icon">⚠️</span>
        <span className="error-text">Credits unavailable</span>
      </div>
    );
  }

  return (
    <div className="credits-display">
      <div className="credits-main" onClick={onPurchaseClick}>
        <div className="credits-info">
          <div className="credits-count">
            <span 
              className="credits-number"
              style={{ color: getCreditsColor(creditsInfo.credits) }}
            >
              {creditsInfo.credits}
            </span>
            <span className="credits-label">credits</span>
            <button 
              className="add-credits-btn"
              onClick={(e) => {
                e.stopPropagation();
                router.push('/pricing');
              }}
              title="Add more credits"
            >
              + Add Credits
            </button>
          </div>
          
          <div className="tier-info">
            <span className="tier-icon">{getTierIcon(creditsInfo.tier)}</span>
            <span 
              className="tier-name"
              style={{ color: getTierColor(creditsInfo.tier) }}
            >
              {creditsInfo.tierInfo.name || 'Trial'}
            </span>
          </div>
          
          {creditsInfo.isTrialUser && creditsInfo.minutesLeft > 0 && (
            <div className="time-remaining">
              <span className="time-icon">⏱️</span>
              <span className="time-text">{creditsInfo.minutesLeft} min left</span>
            </div>
          )}
        </div>

        {creditsInfo.credits <= 10 && (
          <div className="low-credits-warning">
            <span className="warning-icon">⚡</span>
            <span className="warning-text">
              {creditsInfo.credits <= 5 ? 'Very low credits!' : 'Running low'}
            </span>
          </div>
        )}
      </div>

      <div className="credits-breakdown">
        <div className="cost-info">
          <div className="cost-item">
            <span className="cost-type">📚 Lesson Plan</span>
            <span className="cost-amount">{creditsInfo.creditCosts.lesson_plan || 3} credits</span>
          </div>
          <div className="cost-item">
            <span className="cost-type">❓ Quiz</span>
            <span className="cost-amount">{creditsInfo.creditCosts.quiz || 2} credits</span>
          </div>
          <div className="cost-item">
            <span className="cost-type">📊 Presentation</span>
            <span className="cost-amount">{creditsInfo.creditCosts.presentation || 4} credits</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .credits-display {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border: 2px solid #e2e8f0;
          border-radius: 16px;
          padding: 1rem;
          margin: 1rem 0;
          transition: all 0.3s ease;
        }

        .credits-display:hover {
          border-color: #3b9bff;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(59, 155, 255, 0.15);
        }

        .credits-main {
          cursor: pointer;
          margin-bottom: 1rem;
        }

        .credits-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .credits-count {
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
        }

        .add-credits-btn {
          background: linear-gradient(135deg, #3b9bff 0%, #2563eb 100%);
          color: white;
          border: none;
          padding: 0.4rem 0.8rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-left: 0.5rem;
          white-space: nowrap;
        }

        .add-credits-btn:hover {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }

        .add-credits-btn:active {
          transform: translateY(0);
        }

        .credits-number {
          font-size: 2rem;
          font-weight: bold;
          line-height: 1;
        }

        .credits-label {
          font-size: 0.9rem;
          color: #64748b;
          font-weight: 500;
        }

        .tier-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.8);
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.1);
        }

        .tier-icon {
          font-size: 1.2rem;
        }

        .tier-name {
          font-weight: 600;
          font-size: 0.9rem;
        }

        .low-credits-warning {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          color: #92400e;
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
          border: 1px solid #f59e0b;
          font-size: 0.85rem;
          font-weight: 500;
          animation: pulse 2s infinite;
        }

        .warning-icon {
          font-size: 1rem;
        }

        .credits-breakdown {
          border-top: 1px solid #e2e8f0;
          padding-top: 1rem;
        }

        .cost-info {
          display: grid;
          gap: 0.5rem;
        }

        .cost-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.85rem;
        }

        .cost-type {
          color: #64748b;
          font-weight: 500;
        }

        .cost-amount {
          color: #3b9bff;
          font-weight: 600;
        }

        .loading {
          opacity: 0.6;
        }

        .credits-skeleton {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .skeleton-text, .skeleton-number {
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
          border-radius: 4px;
        }

        .skeleton-text {
          width: 80px;
          height: 16px;
        }

        .skeleton-number {
          width: 60px;
          height: 24px;
        }

        .error {
          background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
          border-color: #f87171;
          color: #dc2626;
        }

        .error-icon {
          margin-right: 0.5rem;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        @keyframes loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        @media (max-width: 768px) {
          .credits-display {
            padding: 0.75rem;
            margin: 0.75rem 0;
          }

          .credits-number {
            font-size: 1.5rem;
          }

          .cost-info {
            grid-template-columns: 1fr;
            gap: 0.25rem;
          }

          .cost-item {
            font-size: 0.8rem;
          }
        }
      `}</style>
    </div>
  );
};

export default CreditsDisplay;