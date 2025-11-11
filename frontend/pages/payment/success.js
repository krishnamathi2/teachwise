import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function PaymentSuccess() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading for a smoother UX
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="payment-result-page">
      <div className="result-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Processing your purchase...</p>
          </div>
        ) : (
          <div className="success-state">
            <div className="success-icon">✓</div>
            <h1>Payment Successful!</h1>
            <p className="success-message">
              Your credits have been added to your account.
            </p>
            <div className="action-buttons">
              <Link href="/">
                <button className="primary-button">Start Creating</button>
              </Link>
              <Link href="/credits-test">
                <button className="secondary-button">View Credits</button>
              </Link>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .payment-result-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 2rem;
        }

        .result-container {
          background: white;
          border-radius: 24px;
          padding: 3rem;
          max-width: 500px;
          width: 100%;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
          text-align: center;
        }

        .loading-state {
          padding: 2rem 0;
        }

        .spinner {
          width: 50px;
          height: 50px;
          border: 4px solid #f3f4f6;
          border-top: 4px solid #3b9bff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }

        .success-state {
          animation: fadeIn 0.5s ease-in;
        }

        .success-icon {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
          font-weight: bold;
          margin: 0 auto 2rem;
          animation: scaleIn 0.5s ease-out;
        }

        h1 {
          font-size: 2rem;
          color: #1e293b;
          margin: 0 0 1rem 0;
        }

        .success-message {
          color: #64748b;
          font-size: 1.1rem;
          margin-bottom: 2rem;
        }

        .action-buttons {
          display: flex;
          gap: 1rem;
          flex-direction: column;
        }

        .primary-button, .secondary-button {
          width: 100%;
          padding: 1rem 2rem;
          border-radius: 12px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          border: none;
        }

        .primary-button {
          background: linear-gradient(135deg, #3b9bff 0%, #6bb6ff 100%);
          color: white;
        }

        .primary-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(59, 155, 255, 0.3);
        }

        .secondary-button {
          background: #f1f5f9;
          color: #334155;
        }

        .secondary-button:hover {
          background: #e2e8f0;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleIn {
          from { transform: scale(0); }
          to { transform: scale(1); }
        }

        @media (max-width: 768px) {
          .result-container {
            padding: 2rem;
          }

          h1 {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}
