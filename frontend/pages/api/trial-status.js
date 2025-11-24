// frontend/pages/api/trial-status.js

import { createClient } from '@supabase/supabase-js';

const TRIAL_MINUTES = 10;
const TRIAL_CREDITS = 10;

/**
 * Helper: get Supabase client using service key
 */
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !serviceKey) {
    console.warn('[trial-status] Missing Supabase env vars');
    return null;
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false }
  });
}

/**
 * Helper: normalize email (string or null)
 */
function getEmailFromRequest(req) {
  // 1) From JSON body (POST)
  if (req.body && typeof req.body.email === 'string') {
    return req.body.email.toLowerCase().trim();
  }

  // 2) From query (?email=)
  if (typeof req.query.email === 'string') {
    return req.query.email.toLowerCase().trim();
  }

  // 3) From header (optional, if you wire it up)
  const headerEmail = req.headers['x-user-email'];
  if (typeof headerEmail === 'string') {
    return headerEmail.toLowerCase().trim();
  }

  return null;
}

/**
 * Helper: build consistent response object
 */
function buildResponse({
  ok,
  trialActive,
  creditsRemaining = 0,
  creditsUsed = 0,
  trialExpiresAt = null,
  minutesLeft = 0,
  reason = null,
  isSubscribed = false
}) {
  return {
    ok,
    trialActive,
    creditsRemaining,
    creditsUsed,
    trialExpiresAt, // ISO string or null
    minutesLeft,
    trialMinutes: TRIAL_MINUTES,
    totalTrialCredits: TRIAL_CREDITS,
    credits: creditsRemaining,
    creditsLeft: creditsRemaining,
    isSubscribed,
    reason
  };
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  // Allow CORS for safety (only GET/POST)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-Email');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    // IMPORTANT: keep 200 but tell frontend it's not ok (to avoid "Connection Issue" UI)
    return res
      .status(200)
      .json(buildResponse({ ok: false, trialActive: false, reason: 'METHOD_NOT_ALLOWED' }));
  }

  const email = getEmailFromRequest(req);

  if (!email) {
    // No email yet (user not logged in) – tell frontend gracefully
    console.log('[trial-status] No email provided');
    return res
      .status(200)
      .json(buildResponse({ ok: true, trialActive: false, reason: 'NO_EMAIL' }));
  }

  console.log(`[trial-status] Checking trial status for: ${email}`);

  const supabase = getSupabaseClient();

  // If Supabase is not configured, fall back to a fake "unlimited" trial
  if (!supabase) {
    console.warn('[trial-status] Supabase not configured – returning fallback trial status');
    return res.status(200).json(
      buildResponse({
        ok: true,
        trialActive: true,
        creditsRemaining: TRIAL_CREDITS,
        creditsUsed: 0,
        trialExpiresAt: null,
        minutesLeft: TRIAL_MINUTES,
        reason: 'FALLBACK_NO_SUPABASE'
      })
    );
  }

  try {
    // === 1. Load (or create) trial row ===
    // ASSUMPTION: table name & columns – change to match your DB:
    // table: trial_users
    // columns: email (text, PK/unique), trial_started_at (timestamptz), credits_used (int)
    let { data: trialRow, error: selectError } = await supabase
      .from('trial_users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (selectError && selectError.code !== 'PGRST116') {
      // PGRST116 = "Results contain 0 rows" – that's fine
      console.error('[trial-status] Error loading trial row:', selectError);
    }

    const now = new Date();

    // If no row exists yet, create one (start trial now)
    if (!trialRow) {
      const trialStartedAt = now.toISOString();
      const { data: inserted, error: insertError } = await supabase
        .from('trial_users')
        .insert({
          email,
          trial_started_at: trialStartedAt,
          credits_used: 0
        })
        .select('*')
        .single();

      if (insertError) {
        console.error('[trial-status] Error creating trial row:', insertError);
        // Still respond gracefully
        return res.status(200).json(
          buildResponse({
            ok: false,
            trialActive: false,
            minutesLeft: 0,
            reason: 'DB_INSERT_FAILED'
          })
        );
      }

      trialRow = inserted;
    }

    const trialStart = new Date(trialRow.trial_started_at);
    const trialExpiresAt = new Date(trialStart.getTime() + TRIAL_MINUTES * 60 * 1000);

    const timeRemainingMs = trialExpiresAt.getTime() - now.getTime();
    const timeExpired = timeRemainingMs <= 0;

    const creditsUsed = trialRow.credits_used || 0;
    const creditsRemaining = Math.max(TRIAL_CREDITS - creditsUsed, 0);
    const creditsExhausted = creditsRemaining <= 0;

    const trialActive = !timeExpired && !creditsExhausted;

    // You can optionally update `last_seen_at` etc. here

    // === 2. Return status ===
    const responseMinutesLeft = Math.max(Math.ceil(timeRemainingMs / 60000), 0);

    if (!trialActive) {
      // Trial over – frontend should log out & show subscribe
      return res.status(200).json(
        buildResponse({
          ok: true,
          trialActive: false,
          creditsRemaining,
          creditsUsed,
          trialExpiresAt: trialExpiresAt.toISOString(),
          minutesLeft: 0,
          reason: timeExpired ? 'TRIAL_TIME_EXPIRED' : 'TRIAL_CREDITS_EXHAUSTED'
        })
      );
    }

    // Trial is active
    return res.status(200).json(
      buildResponse({
        ok: true,
        trialActive: true,
        creditsRemaining,
        creditsUsed,
        trialExpiresAt: trialExpiresAt.toISOString(),
        minutesLeft: responseMinutesLeft,
        reason: null
      })
    );
  } catch (err) {
    // Catch any unexpected error and respond safely
    console.error('[trial-status] Unexpected error:', err);
    return res.status(200).json(
      buildResponse({
        ok: false,
        trialActive: false,
          minutesLeft: 0,
        reason: 'UNEXPECTED_ERROR'
      })
    );
  }
}

