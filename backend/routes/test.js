const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

// Test Supabase connection
router.get('/test-connection', async (req, res) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        success: false,
        error: 'Missing Supabase configuration',
        details: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey
        }
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test basic connection
    const { data, error } = await supabase
      .from('users')
      .select('count(*)')
      .limit(1);
    
    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Database connection failed',
        details: error.message
      });
    }
    
    res.json({
      success: true,
      message: 'Supabase connection successful',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Connection test failed',
      details: error.message
    });
  }
});

// Test if credits tables exist
router.get('/test-tables', async (req, res) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const tables = ['credit_transactions', 'credit_packages', 'subscription_plans', 'user_subscriptions'];
    const results = {};
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('count(*)')
          .limit(1);
        
        results[table] = {
          exists: !error,
          error: error ? error.message : null
        };
      } catch (err) {
        results[table] = {
          exists: false,
          error: err.message
        };
      }
    }
    
    res.json({
      success: true,
      tables: results,
      allTablesExist: Object.values(results).every(r => r.exists)
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Table test failed',
      details: error.message
    });
  }
});

module.exports = router;