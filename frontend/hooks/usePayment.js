import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export function usePayment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getPaymentConfig = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND}/payment/config`);
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Error getting payment config:', err);
      return null;
    }
  };

  const purchaseCreditsWithRazorpay = async (packageId) => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Create Razorpay order
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND}/payment/razorpay/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          packageId,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create order');
      }

      // Load Razorpay script
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);

      script.onload = () => {
        const options = {
          key: data.key,
          amount: data.amount,
          currency: data.currency,
          name: 'TeachWise AI',
          description: `${data.package.name} - ${data.package.credits} credits`,
          order_id: data.orderId,
          prefill: {
            name: data.user.name || '',
            email: data.user.email || '',
          },
          theme: {
            color: '#3B82F6',
          },
          handler: async function (response) {
            // Verify payment
            try {
              const verifyResponse = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND}/payment/razorpay/verify`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    orderId: data.orderId,
                    paymentId: response.razorpay_payment_id,
                    signature: response.razorpay_signature,
                    userId: user.id,
                    packageId,
                  }),
                }
              );

              const verifyData = await verifyResponse.json();

              if (verifyData.success) {
                // Redirect to success page
                window.location.href = '/payment/success';
              } else {
                throw new Error('Payment verification failed');
              }
            } catch (err) {
              console.error('Error verifying payment:', err);
              setError(err.message);
              window.location.href = '/payment/failed';
            }
          },
          modal: {
            ondismiss: function () {
              setLoading(false);
              setError('Payment cancelled by user');
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      };

      script.onerror = () => {
        setLoading(false);
        setError('Failed to load payment gateway');
      };
    } catch (err) {
      console.error('Error purchasing credits with Razorpay:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    getPaymentConfig,
    purchaseCreditsWithRazorpay,
  };
}
