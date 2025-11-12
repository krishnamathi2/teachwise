// API route for trial status using Supabase backend

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
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email } = req.query
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' })
  }

  try {
    console.log(`[${new Date().toISOString()}] Checking trial status for: ${email}`)

    // Query user from Supabase - use select without .single() first
    const { data: users, error: userError } = await supabase
      .from('user_trials')
      .select('*')
      .eq('email', email)

    if (userError) {
      console.error('Supabase query error:', userError)
      throw userError
    }

    const user = users && users.length > 0 ? users[0] : null
    const now = new Date()
    const trialDurationMs = 20 * 60 * 1000 // 20 minutes

    if (!user) {
      // New user - create trial entry
      const newUser = {
        email,
        registered_at: now.toISOString(),
        trial_used: false,
        credits: 0,
        paid_amount: 0,
        ip_address: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown'
      }

      const { data: createdUser, error: createError } = await supabase
        .from('user_trials')
        .insert(newUser)
        .select()
        .single()

      if (createError) throw createError

      const trialStartTime = new Date(createdUser.registered_at)
      const trialEndTime = new Date(trialStartTime.getTime() + trialDurationMs)
      const timeRemaining = Math.max(0, trialEndTime.getTime() - now.getTime())

      return res.status(200).json({
        success: true,
        hasTrialAccess: true,
        trialTimeRemaining: timeRemaining,
        trialStarted: createdUser.registered_at,
        creditsRemaining: createdUser.credits || 0,
        isPaid: (createdUser.paid_amount || 0) > 0,
        trialExpired: false,
        isNewUser: true
      })
    }

    // Existing user
    const registrationTime = new Date(user.registered_at)
    const trialEndTime = new Date(registrationTime.getTime() + trialDurationMs)
    const timeRemaining = Math.max(0, trialEndTime.getTime() - now.getTime())
    const trialExpired = timeRemaining === 0

    // Check if user has paid access
    const isPaid = (user.paid_amount || 0) > 0
    const hasTrialAccess = !trialExpired || isPaid

    return res.status(200).json({
      success: true,
      hasTrialAccess,
      trialTimeRemaining: timeRemaining,
      trialStarted: user.registered_at,
      creditsRemaining: user.credits || 0,
      isPaid,
      trialExpired,
      isNewUser: false
    })

  } catch (error) {
    console.error('Trial status error:', error)
    return res.status(500).json({ 
      error: 'Database error',
      message: 'Failed to retrieve trial status'
    })
  }
}