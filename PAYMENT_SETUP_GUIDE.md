# 💳 Payment Gateway Setup Guide

## ✅ Implementation Status

Your payment system is **fully implemented** with:
- ✅ Stripe integration for global payments
- ✅ Razorpay integration for India
- ✅ Credit purchase flow
- ✅ Subscription management
- ✅ Webhook handling for automatic credit addition
- ✅ Payment success/cancel pages

---

## 🔧 Configuration Required

### Step 1: Get Stripe API Keys

1. **Sign up at Stripe**: https://dashboard.stripe.com/register
2. **Get your API keys** from: https://dashboard.stripe.com/test/apikeys
3. **Add to `backend/.env`**:
   ```env
   # Stripe Configuration
   STRIPE_SECRET_KEY=sk_test_your_secret_key_here
   STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
   ```
4. **Add to `frontend/.env.local`**:
   ```env
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
   ```

### Step 2: Setup Stripe Webhook

1. **Install Stripe CLI**: https://stripe.com/docs/stripe-cli
2. **Forward webhooks to local backend**:
   ```bash
   stripe listen --forward-to localhost:3003/webhook
   ```
3. **Copy the webhook secret** and add to `backend/.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
   ```

**For Production:**
- Go to: https://dashboard.stripe.com/webhooks
- Add endpoint: `https://yourdomain.com/webhook`
- Select event: `checkout.session.completed`
- Copy signing secret to production env

### Step 3: Get Razorpay API Keys (for India)

1. **Sign up at Razorpay**: https://dashboard.razorpay.com/signup
2. **Get test keys** from: https://dashboard.razorpay.com/app/keys
3. **Replace in `backend/.env`**:
   ```env
   # Razorpay Configuration
   RAZORPAY_KEY_ID=rzp_test_your_actual_key_id
   RAZORPAY_KEY_SECRET=your_actual_key_secret
   ```

### Step 4: Setup Razorpay Webhook (Optional)

1. Go to: https://dashboard.razorpay.com/app/webhooks
2. Add webhook URL: `https://yourdomain.com/razorpay-webhook`
3. Select events: `payment.captured`, `payment.failed`
4. The webhook secret is your `RAZORPAY_KEY_SECRET`

---

## 📊 Payment Flow Architecture

### One-Time Credit Purchase Flow

```
User → Select Package → Choose Gateway → Complete Payment → Webhook → Credits Added
```

**Stripe Flow:**
1. User clicks "Buy Credits"
2. Frontend calls `/payment/stripe/checkout`
3. User redirected to Stripe checkout
4. After payment, Stripe sends webhook to `/webhook`
5. Backend adds credits via `PaymentManager.processPaymentSuccess()`
6. User redirected to `/payment/success`

**Razorpay Flow:**
1. User clicks "Buy Credits"
2. Frontend calls `/payment/razorpay/order`
3. Razorpay modal opens
4. After payment, frontend calls `/payment/razorpay/verify`
5. Backend verifies signature and adds credits
6. User redirected to `/payment/success`

### Subscription Flow

```
User → Select Plan → Stripe Subscription → Monthly Credit Reset
```

1. User clicks "Subscribe"
2. Frontend calls `/payment/stripe/subscription`
3. User redirected to Stripe subscription checkout
4. Webhook processes subscription creation
5. Monthly credits reset handled by cron/webhook

---

## 🧪 Testing Payment Integration

### Test Stripe Payments

**Test Card Numbers:**
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires Auth: `4000 0025 0000 3155`

**Testing Steps:**
1. Start backend: `cd backend && npm start`
2. Start frontend: `cd frontend && npm run dev`
3. Go to: http://localhost:3000
4. Sign in and navigate to credits purchase
5. Select a package and click "Buy with Stripe"
6. Use test card `4242 4242 4242 4242`
7. Complete checkout
8. Verify credits added in database

### Test Razorpay Payments

**Test Card Numbers:**
- Any card number works in test mode
- Use CVV: `123`, any future expiry

**Testing Steps:**
1. Ensure Razorpay keys are set
2. Select "Pay with Razorpay"
3. Use test card details
4. Complete payment
5. Verify credits added

---

## 📁 Implementation Files

### Backend
- `backend/utils/payment.js` - PaymentManager class
- `backend/index.js` - Payment endpoints (/payment/*)
- Lines 100-196: Webhook handlers

### Frontend
- `frontend/hooks/usePayment.js` - Payment hook
- `frontend/components/CreditsPurchaseModal.jsx` - Purchase UI
- `frontend/pages/payment/success.js` - Success page
- `frontend/pages/payment/cancel.js` - Cancel page

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/payment/config` | GET | Get public keys for gateways |
| `/payment/stripe/checkout` | POST | Create Stripe checkout session |
| `/payment/stripe/subscription` | POST | Create Stripe subscription |
| `/payment/razorpay/order` | POST | Create Razorpay order |
| `/payment/razorpay/verify` | POST | Verify Razorpay payment |
| `/webhook` | POST | Stripe webhook handler |
| `/razorpay-webhook` | POST | Razorpay webhook handler |

---

## 🔒 Security Considerations

### ✅ Already Implemented
- Signature verification for Razorpay
- Webhook secret validation for Stripe
- User authentication before payment
- Metadata tracking in transactions
- Idempotent credit additions

### ⚠️ Production Checklist
- [ ] Use production API keys (not test keys)
- [ ] Enable HTTPS for all endpoints
- [ ] Set up proper CORS configuration
- [ ] Implement rate limiting on payment endpoints
- [ ] Add logging and monitoring
- [ ] Set up email notifications for purchases
- [ ] Configure webhook URL with your domain

---

## 💡 Testing Checklist

Before going live, test:

- [ ] Stripe credit purchase
- [ ] Razorpay credit purchase
- [ ] Stripe subscription
- [ ] Payment success flow
- [ ] Payment cancel flow
- [ ] Webhook credit addition
- [ ] Multiple concurrent payments
- [ ] Duplicate payment handling
- [ ] Failed payment handling
- [ ] Refund process

---

## 🚀 Next Steps

1. **Get API Keys**: Follow Step 1 & 3 above
2. **Test Locally**: Use test mode keys
3. **Verify Webhooks**: Test credit addition
4. **Go Live**: Replace with production keys

Your payment system is ready to accept payments! Just add your API keys and test.
