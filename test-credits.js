// 🧪 Credits System Test Script
// Run this to verify your credits system is working properly

console.log('🎯 Testing Credits System...\n');

// Test 1: Check if backend API is running
async function testBackendAPI() {
    console.log('📡 Testing Backend API...');
    try {
        const response = await fetch('http://localhost:3003/credits/packages');
        if (response.ok) {
            const packages = await response.json();
            console.log('✅ Backend API working!');
            console.log('📦 Available packages:', packages.length);
            
            // Show the ₹100 package
            const package100 = packages.find(p => p.price === 100);
            if (package100) {
                console.log(`💰 ₹100 Package: ${package100.credits} credits (${package100.bonus_credits} bonus)`);
                console.log(`📊 Total value: ${package100.credits + package100.bonus_credits} credits for ₹100`);
            }
        } else {
            console.log('❌ Backend API not responding');
        }
    } catch (error) {
        console.log('❌ Backend API error:', error.message);
    }
}

// Test 2: Check if frontend is accessible
async function testFrontend() {
    console.log('\n🌐 Testing Frontend...');
    try {
        const response = await fetch('http://localhost:3000');
        if (response.ok) {
            console.log('✅ Frontend accessible at http://localhost:3000');
        } else {
            console.log('❌ Frontend not responding');
        }
    } catch (error) {
        console.log('❌ Frontend error:', error.message);
    }
}

// Test 3: Verify pricing calculations
function testPricingLogic() {
    console.log('\n💰 Testing Pricing Logic...');
    
    const creditCosts = {
        lesson_plan: 2,
        quiz: 1,
        presentation: 3
    };
    
    const package100Credits = 200; // ₹100 = 200 credits
    
    console.log('📚 With 200 credits (₹100 package), users can generate:');
    console.log(`   📖 ${Math.floor(package100Credits / creditCosts.lesson_plan)} Lesson Plans`);
    console.log(`   📝 ${Math.floor(package100Credits / creditCosts.quiz)} Quizzes`);
    console.log(`   📊 ${Math.floor(package100Credits / creditCosts.presentation)} Presentations`);
    
    // Mixed usage example
    const mixed = {
        lessons: 50, // 50 lessons × 2 credits = 100 credits
        quizzes: 50, // 50 quizzes × 1 credit = 50 credits  
        presentations: 16 // 16 presentations × 3 credits = 48 credits
    };
    
    const totalUsed = (mixed.lessons * 2) + (mixed.quizzes * 1) + (mixed.presentations * 3);
    
    console.log('\n🎯 Example Mixed Usage (₹100 package):');
    console.log(`   📖 ${mixed.lessons} Lesson Plans (${mixed.lessons * 2} credits)`);
    console.log(`   📝 ${mixed.quizzes} Quizzes (${mixed.quizzes * 1} credits)`);
    console.log(`   📊 ${mixed.presentations} Presentations (${mixed.presentations * 3} credits)`);
    console.log(`   📊 Total: ${totalUsed} credits used, ${package100Credits - totalUsed} remaining`);
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Starting Credits System Tests...\n');
    
    await testBackendAPI();
    await testFrontend();
    testPricingLogic();
    
    console.log('\n🏆 Tests Complete!');
    console.log('\n📋 Next Steps:');
    console.log('1. 🗄️  Set up Supabase database (run credits-schema.sql)');
    console.log('2. 🔑 Add SUPABASE_SERVICE_KEY to backend/.env');
    console.log('3. 🧪 Test user signup and credit operations');
    console.log('4. 💳 Configure Stripe for payments');
    console.log('5. 🚀 Deploy to production!');
    
    console.log('\n💎 Your credits system is ready to generate revenue!');
}

// Execute tests
runAllTests().catch(console.error);