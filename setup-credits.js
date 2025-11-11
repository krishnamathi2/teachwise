#!/usr/bin/env node

// TeachWise Credits System Setup Script
// Run this script to set up the complete credits system

const fs = require('fs');
const path = require('path');

console.log('🚀 TeachWise Credits System Setup');
console.log('=====================================\n');

// Step-by-step setup instructions
const setupSteps = [
  {
    step: 1,
    title: '🗃️ Database Setup',
    description: 'Set up the credits tables in Supabase',
    instructions: [
      '1. Open your Supabase dashboard: https://supabase.com/dashboard',
      '2. Go to your TeachWise project',
      '3. Navigate to SQL Editor',
      '4. Copy and execute the SQL from: backend/database/credits-schema.sql',
      '5. Verify tables are created: users, credit_transactions, credit_packages, etc.'
    ]
  },
  {
    step: 2,
    title: '🔑 Environment Variables',
    description: 'Configure Supabase credentials',
    instructions: [
      '1. Check backend/.env file has:',
      '   - SUPABASE_URL=your_supabase_url',
      '   - SUPABASE_SERVICE_KEY=your_service_key (not anon key!)',
      '2. Check frontend/.env.local has:',
      '   - NEXT_PUBLIC_SUPABASE_URL=your_supabase_url',
      '   - NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key'
    ]
  },
  {
    step: 3,
    title: '🔄 Server Restart',
    description: 'Restart both servers to load new code',
    instructions: [
      '1. Stop current servers (Ctrl+C in terminals)',
      '2. Start backend: cd backend && npm start',
      '3. Start frontend: cd frontend && npm run dev',
      '4. Verify credits endpoints: http://localhost:3003/credits/packages'
    ]
  },
  {
    step: 4,
    title: '🧪 Test Credits System',
    description: 'Test the credits functionality',
    instructions: [
      '1. Sign up/login to the app',
      '2. Check if credits display shows (should show 10 free credits)',
      '3. Try generating content to see credits deduction',
      '4. Click on credits display to open purchase modal',
      '5. Verify all credit packages show ₹100 = 200 credits'
    ]
  },
  {
    step: 5,
    title: '💳 Payment Integration (Optional)',
    description: 'Set up Stripe for payments',
    instructions: [
      '1. Create Stripe account: https://stripe.com',
      '2. Create products and prices in Stripe dashboard',
      '3. Add webhook endpoints for payment success',
      '4. Update environment variables with Stripe keys',
      '5. Test payment flow in development mode'
    ]
  }
];

// Display setup steps
setupSteps.forEach(step => {
  console.log(`\n📋 STEP ${step.step}: ${step.title}`);
  console.log(`📝 ${step.description}\n`);
  
  step.instructions.forEach(instruction => {
    console.log(`   ${instruction}`);
  });
  
  console.log('\n' + '─'.repeat(60));
});

// Check if files exist
console.log('\n🔍 CHECKING IMPLEMENTATION FILES:\n');

const filesToCheck = [
  'backend/database/credits-schema.sql',
  'backend/utils/credits.js',
  'frontend/components/CreditsDisplay.jsx',
  'frontend/components/CreditsPurchaseModal.jsx',
  'CREDITS_SYSTEM.md',
  'PRICING_STRATEGY_INDIA.md'
];

filesToCheck.forEach(file => {
  const exists = fs.existsSync(file);
  const status = exists ? '✅' : '❌';
  console.log(`${status} ${file}`);
});

// Quick test function
console.log('\n🧪 QUICK TESTS:\n');

console.log('📡 Test backend credits endpoints:');
console.log('   curl http://localhost:3003/credits/packages');
console.log('   curl http://localhost:3003/credits/plans');
console.log('   curl http://localhost:3003/credits/balance?userId=test-user-id');

console.log('\n🌐 Frontend URLs to test:');
console.log('   Frontend: http://localhost:3001');
console.log('   Backend API: http://localhost:3003');

console.log('\n🎯 SUCCESS INDICATORS:');
console.log('   ✅ Credits display shows in the app header');
console.log('   ✅ Free users start with 10 credits');
console.log('   ✅ Credit packages show ₹100 = 200 credits');
console.log('   ✅ Content generation deducts correct credits');
console.log('   ✅ Low credits warning appears when < 5 credits');

console.log('\n🆘 TROUBLESHOOTING:');
console.log('   💡 If credits don\'t show: Check Supabase credentials');
console.log('   💡 If API errors: Verify database tables are created');
console.log('   💡 If components missing: Check import statements');
console.log('   💡 If styling broken: Verify CSS is loaded');

console.log('\n🎉 NEXT STEPS AFTER SETUP:');
console.log('   1. 📊 Monitor credit usage analytics');
console.log('   2. 💰 Set up Stripe for real payments');
console.log('   3. 📧 Configure email notifications');
console.log('   4. 🚀 Deploy to production');
console.log('   5. 📈 A/B test pricing strategies');

console.log('\n✨ Your credits system is ready to generate revenue! ✨');
console.log('💰 ₹100 = 200 credits with 60%+ profit margin! 💰\n');