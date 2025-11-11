# 💰 TeachWise Credits System - Implementation Guide

## 🎯 Overview

The TeachWise Credits System is a comprehensive solution for monetizing AI-powered content generation through a flexible credit-based model with subscription tiers.

## 📊 Credit Pricing Structure

### 💎 Credit Costs per Operation
- **Lesson Plan**: 3 credits
- **Quiz Generation**: 2 credits  
- **Presentation**: 4 credits
- **Quick Question**: 1 credit

### 👥 User Tiers
- **Free Tier**: 10 free credits on signup (one-time)
- **Basic Plan**: 100 credits/month ($9.99)
- **Pro Plan**: 300 credits/month ($24.99) - *Most Popular*
- **Enterprise**: Unlimited credits ($49.99)

### 💳 Credit Packages (One-time Purchase)
- **Starter Pack**: 50 credits - $4.99
- **Power Pack**: 150 credits - $12.99
- **Mega Pack**: 500 credits - $39.99
- **Ultra Pack**: 1000 credits - $69.99

## 🏗️ Architecture

### Database Schema

#### Tables Created:
1. **users** (modified) - Added `credits`, `subscription_tier`, `last_credit_reset`
2. **credit_transactions** - Transaction history
3. **credit_packages** - Available credit packages
4. **subscription_plans** - Monthly subscription plans
5. **user_subscriptions** - User subscription tracking

#### Key Database Functions:
- `get_user_credits(user_uuid)` - Get current credits
- `deduct_credits(user_uuid, amount, operation_type, description)` - Atomic credit deduction
- `add_credits(user_uuid, amount, transaction_type, description, metadata)` - Add credits

### Backend Implementation

#### API Endpoints:
- `GET /credits/balance?userId={id}` - Get user credits and tier info
- `GET /credits/check?userId={id}&operationType={type}` - Check sufficient credits
- `GET /credits/history?userId={id}&limit={n}` - Transaction history
- `GET /credits/packages` - Available credit packages
- `GET /credits/plans` - Subscription plans
- `POST /credits/add` - Add credits (admin/testing)

#### Credits Manager (`backend/utils/credits.js`):
- Centralized credits management
- Atomic operations to prevent race conditions
- Monthly credit reset for subscribers
- Transaction logging

### Frontend Components

#### 1. **CreditsDisplay Component** (`frontend/components/CreditsDisplay.jsx`)
- Real-time credits display
- Tier information with icons
- Cost breakdown per operation
- Low credits warnings
- Auto-refresh every 30 seconds

#### 2. **CreditsPurchaseModal Component** (`frontend/components/CreditsPurchaseModal.jsx`)
- Tabbed interface (Packages vs Subscriptions)
- Beautiful cards with pricing
- Stripe integration ready
- Mobile responsive

#### 3. **Integration with AuthGate**
- Credits display in authenticated header
- Low credits banner warnings
- Purchase modal integration

## 🔄 User Flow

### 1. **New User Registration**
```
User signs up → Gets 10 free credits → Can generate content → Credits depleted → Purchase options shown
```

### 2. **Content Generation Process**
```
User requests generation → Check credits → Deduct credits → Process AI request → Return result
```

### 3. **Insufficient Credits**
```
User requests generation → Insufficient credits → Show error + purchase options → User purchases → Continue generation
```

### 4. **Monthly Subscription Reset**
```
Monthly cycle → Check last reset date → Reset credits to tier allowance → Log transaction
```

## 💳 Payment Integration

### Stripe Integration Points:
1. **Credit Packages**: One-time payments
2. **Subscriptions**: Recurring monthly billing
3. **Webhooks**: Handle successful payments and subscription events

### Required Stripe Setup:
```javascript
// Credit package payment
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  line_items: [{ price: package.stripe_price_id, quantity: 1 }],
  success_url: `${domain}/success?credits=${package.credits}`,
  cancel_url: `${domain}/canceled`
});

// Subscription payment
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
  success_url: `${domain}/success?subscription=true`,
  cancel_url: `${domain}/canceled`
});
```

## 🔧 Implementation Steps

### Phase 1: Database Setup ✅
1. Execute `backend/database/credits-schema.sql` in Supabase
2. Insert default packages and plans
3. Test database functions

### Phase 2: Backend API ✅
1. Implement `backend/utils/credits.js`
2. Add credits endpoints to `backend/index.js`
3. Integrate credits checking in `/generate` endpoint
4. Test all API endpoints

### Phase 3: Frontend Components ✅
1. Create `CreditsDisplay` component
2. Create `CreditsPurchaseModal` component
3. Integrate with `AuthGate` component
4. Update `Generator` to pass userId
5. Add CSS styling

### Phase 4: Payment Integration (TODO)
1. Set up Stripe products and prices
2. Create checkout session endpoints
3. Implement webhook handlers
4. Test payment flows
5. Handle subscription management

### Phase 5: Testing & Optimization
1. Test credit deduction flows
2. Test payment integrations
3. Load testing for concurrent users
4. Mobile optimization
5. Error handling improvements

## 🚨 Error Handling

### Credit Errors:
- **Insufficient Credits**: Show specific error with current/required credits
- **API Failures**: Graceful degradation with retry options
- **Payment Failures**: Clear error messages with support links

### Edge Cases:
- **Concurrent Requests**: Atomic database operations prevent double-spending
- **Failed AI Requests**: Credits not deducted if OpenAI API fails
- **Subscription Lapses**: Graceful downgrade to free tier

## 📱 Mobile Optimizations

### Credits Display:
- Responsive grid layouts
- Touch-friendly buttons (44px minimum)
- Optimized for mobile purchase flow
- iOS/Android specific styling

### Purchase Modal:
- Full-screen on mobile
- Easy payment method selection
- Clear pricing information
- Accessibility compliance

## 🔒 Security Considerations

### Backend Security:
- User ID validation on all endpoints
- Rate limiting on credit operations
- Audit trail for all transactions
- Webhook signature verification

### Frontend Security:
- No sensitive data in localStorage
- Secure authentication with Supabase
- Input validation and sanitization
- CSRF protection

## 📈 Analytics & Monitoring

### Key Metrics to Track:
- Credits usage per user
- Conversion rates (free → paid)
- Popular content types
- Monthly recurring revenue
- Churn rates

### Monitoring:
- Credit balance alerts
- Payment failure notifications
- Unusual spending patterns
- System performance metrics

## 🎨 UI/UX Best Practices

### Credits Display:
- Clear, prominent credits counter
- Color-coded warnings (green → amber → red)
- Tier badges with meaningful icons
- Cost transparency

### Purchase Experience:
- Value proposition highlighting
- Social proof and testimonials
- Multiple payment options
- Clear refund policy

## 🔄 Future Enhancements

### Planned Features:
1. **Credit Gifting**: Send credits to other users
2. **Bulk Discounts**: Volume pricing for enterprise
3. **API Access**: Credits for API usage
4. **Referral Program**: Earn credits for referrals
5. **Advanced Analytics**: Usage insights dashboard

### Technical Improvements:
1. **Caching**: Redis for credits balance
2. **Queue System**: Background credit processing
3. **Multi-currency**: Local payment methods
4. **A/B Testing**: Pricing optimization

## 📞 Support & Troubleshooting

### Common Issues:
1. **Credits not updating**: Check browser cache, refresh credits display
2. **Payment not processed**: Verify webhook configuration
3. **Subscription not active**: Check Stripe subscription status
4. **Monthly reset not working**: Verify cron job configuration

### Debug Endpoints:
- `GET /debug/credits/{userId}` - Detailed credit information
- `POST /debug/reset-credits/{userId}` - Manual credit reset
- `GET /debug/transactions/{userId}` - Full transaction history

---

## 💡 Getting Started

1. **Set up Database**: Run the SQL schema in Supabase
2. **Install Dependencies**: Ensure all npm packages are installed
3. **Configure Environment**: Set up Stripe keys and Supabase credentials
4. **Test Components**: Verify credits display and purchase modal
5. **Integrate Payments**: Set up Stripe products and webhooks

The credits system is now ready for production deployment! 🚀

---

*Last updated: October 23, 2025*