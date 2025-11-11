require('dotenv').config();
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

async function testRazorpay() {
  console.log('\n🧪 Testing Razorpay Integration...\n');
  
  // Check environment variables
  console.log('1. Checking environment variables...');
  if (!process.env.RAZORPAY_KEY_ID) {
    console.error('   ❌ RAZORPAY_KEY_ID not found in .env');
    return;
  }
  if (!process.env.RAZORPAY_KEY_SECRET) {
    console.error('   ❌ RAZORPAY_KEY_SECRET not found in .env');
    return;
  }
  console.log('   ✅ Environment variables configured');
  console.log('   Key ID:', process.env.RAZORPAY_KEY_ID.substring(0, 15) + '...');
  
  // Test connection by creating an order
  console.log('\n2. Testing Razorpay API connection...');
  try {
    const order = await razorpay.orders.create({
      amount: 10000, // ₹100 in paise
      currency: 'INR',
      receipt: 'test_receipt_' + Date.now(),
      notes: {
        test: true,
        purpose: 'Integration test'
      }
    });
    
    console.log('   ✅ Razorpay API connection successful!');
    console.log('\n📦 Test Order Created:');
    console.log('   Order ID:', order.id);
    console.log('   Amount:', order.amount / 100, 'INR');
    console.log('   Currency:', order.currency);
    console.log('   Status:', order.status);
    console.log('   Receipt:', order.receipt);
    
    console.log('\n✅ All tests passed! Razorpay is configured correctly.');
    console.log('\n💡 Next steps:');
    console.log('   1. Start the backend server: npm start');
    console.log('   2. Test the payment endpoints');
    console.log('   3. Start the frontend and test the payment flow');
    
  } catch (error) {
    console.error('\n❌ Razorpay API connection failed:');
    console.error('   Error:', error.message);
    
    if (error.statusCode === 401) {
      console.error('\n💡 Troubleshooting:');
      console.error('   - Check if your Razorpay Key ID is correct');
      console.error('   - Check if your Razorpay Key Secret is correct');
      console.error('   - Make sure you\'re using the correct test/production keys');
    } else if (error.statusCode === 400) {
      console.error('\n💡 Troubleshooting:');
      console.error('   - Invalid request parameters');
      console.error('   - Check the Razorpay API documentation');
    } else {
      console.error('\n💡 Troubleshooting:');
      console.error('   - Check your internet connection');
      console.error('   - Check Razorpay service status');
      console.error('   - Review the error message above');
    }
  }
}

// Run the test
console.log('═══════════════════════════════════════');
console.log('   Razorpay Integration Test');
console.log('═══════════════════════════════════════');

testRazorpay().then(() => {
  console.log('\n═══════════════════════════════════════\n');
});
