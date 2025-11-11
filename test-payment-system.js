#!/usr/bin/env node
/**
 * Payment System Test Script
 * Run this to verify all payment endpoints are working
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3003';

async function testEndpoint(name, url, options = {}) {
  try {
    console.log(`\n🧪 Testing: ${name}`);
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ ${name}: SUCCESS`);
      console.log(`   Response:`, JSON.stringify(data, null, 2).split('\n').slice(0, 5).join('\n'));
    } else {
      console.log(`❌ ${name}: FAILED`);
      console.log(`   Error:`, data.error || data.message);
    }
    
    return { success: response.ok, data };
  } catch (error) {
    console.log(`❌ ${name}: ERROR`);
    console.log(`   ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Starting Payment System Tests...\n');
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log('━'.repeat(50));

  // Test 1: Check backend is running
  await testEndpoint(
    'Backend Health Check',
    `${BACKEND_URL}/health`
  );

  // Test 2: Get payment configuration
  await testEndpoint(
    'Get Payment Config',
    `${BACKEND_URL}/payment/config`
  );

  // Test 3: Get credit packages
  await testEndpoint(
    'Get Credit Packages',
    `${BACKEND_URL}/credits/packages`
  );

  // Test 4: Get subscription plans
  await testEndpoint(
    'Get Subscription Plans',
    `${BACKEND_URL}/credits/plans`
  );

  // Test 5: Test Supabase connection
  await testEndpoint(
    'Supabase Connection Test',
    `${BACKEND_URL}/test/connection`
  );

  // Test 6: Test database tables
  await testEndpoint(
    'Database Tables Test',
    `${BACKEND_URL}/test/tables`
  );

  console.log('\n' + '━'.repeat(50));
  console.log('\n✨ Tests Complete!\n');
  console.log('📝 Next Steps:');
  console.log('   1. Add Stripe/Razorpay API keys to backend/.env');
  console.log('   2. Test actual payment flow with test cards');
  console.log('   3. Verify credits are added after payment');
  console.log('   4. Check webhook processing\n');
}

// Run tests
runTests().catch(console.error);
