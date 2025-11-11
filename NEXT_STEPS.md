# 🚀 Next Steps - Razorpay Payment Setup

## ✅ Completed
- [x] Removed all Stripe code from backend and frontend
- [x] Simplified payment system to Razorpay only
- [x] Updated UI to show only Razorpay payment buttons
- [x] Removed Stripe dependency from package.json
- [x] Reinstalled dependencies without Stripe

## 📋 TODO - Before Testing

### 1. Get Razorpay Test Credentials
Visit: https://dashboard.razorpay.com/app/keys

You'll need:
- **Key ID** (starts with `rzp_test_`)
- **Key Secret**

### 2. Update Backend Environment Variables
Add to `backend/.env`:
```env
RAZORPAY_KEY_ID=rzp_test_your_key_id_here
RAZORPAY_KEY_SECRET=your_secret_key_here
```

### 3. Start Backend Server
```bash
cd backend
npm start
```

Expected output:
```
✓ Connected to Supabase
✓ Razorpay payment gateway configured
Server running on http://localhost:3003
```

### 4. Test Payment Endpoints

#### Test Config Endpoint
```bash
curl http://localhost:3003/payment/config
```
Should return:
```json
{
  "razorpay": {
    "enabled": true,
    "keyId": "rzp_test_xxxxx"
  }
}
```

#### Test Create Order
```bash
curl -X POST http://localhost:3003/payment/razorpay/order \
  -H "Content-Type: application/json" \
  -d '{"packageId": "some-package-id", "userId": "test-user-id"}'
```

### 5. Start Frontend
```bash
cd frontend
npm run dev
```

### 6. Test Frontend Payment Flow

1. **Sign up / Login** to the application
2. **Open Credits Modal** (usually from profile or credits button)
3. **Select a credit package**
4. **Click "Pay ₹XXX"** button
5. **Razorpay checkout should open**

Use Razorpay test cards:
- **Card**: 4111 1111 1111 1111
- **CVV**: Any 3 digits
- **Expiry**: Any future date

### 7. Verify Credits Added

After successful payment:
- Check user's credit balance in the UI
- Check `credit_transactions` table in Supabase
- Verify transaction record created

## 🧪 Testing Checklist

### Backend Tests
- [ ] Server starts without Stripe errors
- [ ] `/payment/config` returns Razorpay config only
- [ ] `/payment/razorpay/order` creates order successfully
- [ ] `/payment/razorpay/verify` validates signatures correctly
- [ ] `/razorpay-webhook` processes webhooks

### Frontend Tests
- [ ] Credits modal opens without errors
- [ ] Only Razorpay button visible (no Stripe button)
- [ ] Footer says "Razorpay" not "Stripe"
- [ ] Clicking payment button opens Razorpay checkout
- [ ] Successful payment adds credits to account
- [ ] Failed payment shows error message
- [ ] Subscription tab shows "unavailable" message

### Database Tests
- [ ] `users` table has correct credit balance
- [ ] `credit_transactions` records payment
- [ ] `credit_packages` pricing matches UI
- [ ] All foreign keys work correctly

## 🔧 Troubleshooting

### Issue: "Razorpay is not defined"
**Solution**: Check `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in backend/.env

### Issue: "Payment verification failed"
**Solution**: Ensure webhook signature validation is using correct secret

### Issue: Credits not added after payment
**Solution**: 
1. Check backend logs for errors
2. Verify `processPaymentSuccess()` is called
3. Check `credit_transactions` table for entry

### Issue: Frontend shows "payment not available"
**Solution**: 
1. Check `/payment/config` endpoint response
2. Ensure `paymentConfig.razorpay.enabled === true`
3. Verify backend is running

## 📚 Reference Documentation

- **Razorpay Docs**: https://razorpay.com/docs/
- **Test Cards**: https://razorpay.com/docs/payments/payments/test-card-details/
- **Webhooks**: https://razorpay.com/docs/webhooks/
- **API Reference**: https://razorpay.com/docs/api/

## 🎯 Quick Test Script

Create `backend/test-razorpay.js`:
```javascript
require('dotenv').config();
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

async function testRazorpay() {
  try {
    console.log('Testing Razorpay connection...');
    
    // Create a test order
    const order = await razorpay.orders.create({
      amount: 10000, // ₹100 in paise
      currency: 'INR',
      receipt: 'test_receipt_1'
    });
    
    console.log('✅ Razorpay connection successful!');
    console.log('Order ID:', order.id);
    console.log('Amount:', order.amount / 100, 'INR');
  } catch (error) {
    console.error('❌ Razorpay connection failed:', error.message);
  }
}

testRazorpay();
```

Run:
```bash
cd backend
node test-razorpay.js
```

## 🚀 Production Deployment Checklist

Before going live:
- [ ] Replace test keys with production keys
- [ ] Set up webhook URL in Razorpay dashboard
- [ ] Enable only required payment methods
- [ ] Set up payment reconciliation
- [ ] Add proper error logging
- [ ] Test with real transactions
- [ ] Set up payment alerts
- [ ] Configure refund policy
- [ ] Update terms of service
- [ ] Test payment failure scenarios

## 💡 Payment Flow Summary

```
User clicks "Pay ₹XXX"
       ↓
Frontend calls purchaseCreditsWithRazorpay()
       ↓
Backend creates Razorpay order (/payment/razorpay/order)
       ↓
Frontend opens Razorpay checkout with order details
       ↓
User completes payment on Razorpay
       ↓
Razorpay sends webhook to backend (/razorpay-webhook)
       ↓
Backend verifies signature and adds credits
       ↓
Frontend receives success callback
       ↓
UI updates with new credit balance
```

## 📞 Support

If you encounter issues:
1. Check backend logs for errors
2. Verify environment variables are set correctly
3. Test with Razorpay test mode first
4. Review `STRIPE_REMOVAL_SUMMARY.md` for complete changes
5. Check Razorpay dashboard for transaction status
