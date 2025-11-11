import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function CreditsTest() {
  const [user, setUser] = useState(null);
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [testResults, setTestResults] = useState([]);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        await getUserCredits(user.id);
      }
    } catch (error) {
      console.error('Error checking user:', error);
    }
    setLoading(false);
  };

  const getUserCredits = async (userId) => {
    try {
      const response = await fetch('/api/credits/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      
      const data = await response.json();
      setCredits(data.credits || 0);
      
      addTestResult('✅ Credits API working', `Current credits: ${data.credits}`);
    } catch (error) {
      addTestResult('❌ Credits API failed', error.message);
    }
  };

  const testDeductCredits = async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/credits/deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id, 
          amount: 5, 
          operation: 'test_deduction',
          description: 'Test credit deduction'
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        addTestResult('✅ Credit deduction working', `Deducted 5 credits`);
        await getUserCredits(user.id);
      } else {
        addTestResult('❌ Credit deduction failed', data.message);
      }
    } catch (error) {
      addTestResult('❌ Credit deduction error', error.message);
    }
  };

  const testAddCredits = async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/credits/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id, 
          amount: 50, 
          type: 'bonus',
          description: 'Test credit bonus'
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        addTestResult('✅ Credit addition working', `Added 50 credits`);
        await getUserCredits(user.id);
      } else {
        addTestResult('❌ Credit addition failed', data.message);
      }
    } catch (error) {
      addTestResult('❌ Credit addition error', error.message);
    }
  };

  const addTestResult = (title, message) => {
    setTestResults(prev => [...prev, { 
      title, 
      message, 
      timestamp: new Date().toLocaleTimeString() 
    }]);
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Credits System Test</h1>
        <p>Please log in to test the credits system.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Credits System Test Page</h1>
      
      {/* User Info */}
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-2">User Information</h2>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>User ID:</strong> {user.id}</p>
        <p><strong>Current Credits:</strong> {credits}</p>
      </div>

      {/* Test Controls */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
        <div className="space-x-4">
          <button
            onClick={() => getUserCredits(user.id)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Refresh Credits
          </button>
          <button
            onClick={testAddCredits}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Add 50 Credits (Test)
          </button>
          <button
            onClick={testDeductCredits}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Deduct 5 Credits (Test)
          </button>
        </div>
      </div>

      {/* Test Results */}
      <div className="bg-white border rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-4">Test Results</h2>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {testResults.length === 0 ? (
            <p className="text-gray-500">No tests run yet. Click the buttons above to test!</p>
          ) : (
            testResults.map((result, index) => (
              <div key={index} className="border-l-4 border-gray-300 pl-4 py-2">
                <div className="font-semibold">{result.title}</div>
                <div className="text-sm text-gray-600">{result.message}</div>
                <div className="text-xs text-gray-400">{result.timestamp}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-yellow-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Testing Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Make sure you've executed the SQL schema in Supabase</li>
          <li>Ensure your environment variables are set (SUPABASE_URL, etc.)</li>
          <li>Click "Add 50 Credits" to test credit addition</li>
          <li>Click "Deduct 5 Credits" to test credit deduction</li>
          <li>Check the test results below</li>
          <li>Verify in Supabase that transactions are being recorded</li>
        </ol>
      </div>
    </div>
  );
}