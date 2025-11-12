// Debug API to test Supabase connection and table structure

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const debug = {
    timestamp: new Date().toISOString(),
    environment: {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET',
      supabaseKey: (process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ? 'SET' : 'NOT SET',
      nodeEnv: process.env.NODE_ENV
    },
    tests: {}
  }

  try {
    // Test 1: Basic connection
    debug.tests.basicConnection = 'Testing...'
    const { data: basicData, error: basicError } = await supabase
      .from('user_trials')
      .select('count', { count: 'exact', head: true })

    if (basicError) {
      debug.tests.basicConnection = { error: basicError.message, code: basicError.code }
    } else {
      debug.tests.basicConnection = { success: true, count: basicData }
    }

    // Test 2: Simple select
    debug.tests.simpleSelect = 'Testing...'
    const { data: selectData, error: selectError } = await supabase
      .from('user_trials')
      .select('*')
      .limit(1)

    if (selectError) {
      debug.tests.simpleSelect = { error: selectError.message, code: selectError.code }
    } else {
      debug.tests.simpleSelect = { success: true, rowCount: selectData ? selectData.length : 0 }
    }

    // Test 3: Insert test (simulate trial-status API)
    debug.tests.insertTest = 'Testing...'
    try {
      const testUser = {
        email: 'debug-test@example.com',
        registered_at: new Date().toISOString(),
        trial_used: false,
        credits: 0,
        paid_amount: 0
        // ip_address: 'debug-test'  // Commented out due to schema mismatch
      }

      const { data: insertData, error: insertError } = await supabase
        .from('user_trials')
        .insert(testUser)
        .select()
        .single()

      if (insertError) {
        debug.tests.insertTest = { error: insertError.message, code: insertError.code }
      } else {
        debug.tests.insertTest = { success: true, insertedData: insertData }

        // Clean up test record
        await supabase
          .from('user_trials')
          .delete()
          .eq('email', 'debug-test@example.com')
      }
    } catch (insertErr) {
      debug.tests.insertTest = { error: insertErr.message }
    }

    // Test 4: Check specific email query
    debug.tests.emailQuery = 'Testing...'
    const { data: emailData, error: emailError } = await supabase
      .from('user_trials')
      .select('*')
      .eq('email', 'test@example.com')

    if (emailError) {
      debug.tests.emailQuery = { error: emailError.message, code: emailError.code }
    } else {
      debug.tests.emailQuery = { success: true, foundRows: emailData ? emailData.length : 0 }
    }

  } catch (error) {
    debug.tests.catchAll = { error: error.message }
  }

  return res.status(200).json(debug)
}