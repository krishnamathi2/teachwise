// frontend/pages/api/trial-status.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    '[trial-status] Missing Supabase env vars. Check SUPABASE_URL and SUPABASE_SERVICE_KEY.'
  );
}

const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { email } = req.body || {};

  // 1) Validate input early
  if (!email || typeof email !== 'string') {
    return res.status(400).json({
      ok: false,
      error: 'Email is required to check trial status.',
    });
  }

  if (!supabase) {
    return res.status(500).json({
      ok: false,
      error: 'Server is not configured correctly (Supabase client missing).',
    });
  }

  console.log('[trial-status] Checking trial status for:', email);

  try {
    // ⚠️ Adjust table + column names if needed
    // Example assumes table: "trial_users" and column "email"
    const { data, error } = await supabase
      .from('user_trials') // <-- change if your table has a different name
      .select('id, email, remaining_credits, expires_at, is_active')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.error('[trial-status] Supabase error:', error);

      // Handle the Postgres 22P02 error (invalid input syntax)
      if (error.code === '22P02') {
        return res.status(400).json({
          ok: false,
          error:
            'Invalid identifier passed to trial-status (check types in Supabase).',
          code: error.code,
        });
      }

      return res
        .status(500)
        .json({ ok: false, error: 'Database error while reading trial info.' });
    }

    // No row found – return a safe default instead of 500
    if (!data) {
      return res.status(200).json({
        ok: true,
        trialStatus: 'not_found',
        remainingCredits: 0,
        expiresAt: null,
        isActive: false,
      });
    }

    // Row found – normal success response
    return res.status(200).json({
      ok: true,
      trialStatus: data.is_active ? 'active' : 'inactive',
      remainingCredits: data.remaining_credits ?? 0,
      expiresAt: data.expires_at ?? null,
      isActive: !!data.is_active,
    });
  } catch (err) {
    console.error('[trial-status] Unexpected error:', err);
    return res
      .status(500)
      .json({ ok: false, error: 'Unexpected server error in trial-status.' });
  }
}
