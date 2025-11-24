// frontend/pages/api/trial-status.js

const DEFAULT_BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'http://localhost:3001';

const TRIAL_MINUTES_FALLBACK = 10;
const TRIAL_CREDITS_FALLBACK = 10;

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
  isSubscribed = false,
  totalTrialCredits = null
}) {
  return {
    ok,
    trialActive,
    creditsRemaining,
    creditsUsed,
    trialExpiresAt, // ISO string or null
    minutesLeft,
    trialMinutes: TRIAL_MINUTES_FALLBACK,
    totalTrialCredits: totalTrialCredits ?? TRIAL_CREDITS_FALLBACK,
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

  try {
    const backendUrl = new URL('/trial-status', DEFAULT_BACKEND_URL);
    backendUrl.searchParams.set('email', email);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'TeachWise-Frontend-TrialProxy'
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error('[trial-status] Backend error:', response.status, response.statusText);
      return res.status(200).json(
        buildResponse({
          ok: false,
          trialActive: false,
          minutesLeft: 0,
          reason: response.status >= 500 ? 'BACKEND_ERROR' : 'BACKEND_UNAVAILABLE'
        })
      );
    }

    const backendData = await response.json();

    const creditsRemaining = backendData.creditsLeft ?? backendData.credits ?? 0;
    const minutesLeft = backendData.minutesLeft ?? 0;
    const trialExpired = Boolean(backendData.trialExpired);
    const trialActive = !trialExpired;
    const isSubscribed = Boolean(backendData.isSubscribed);

    let totalTrialCredits = backendData.totalTrialCredits;
    if (totalTrialCredits == null && backendData.maxGenerations != null && backendData.creditsPerGenerate != null) {
      totalTrialCredits = backendData.maxGenerations * backendData.creditsPerGenerate + creditsRemaining;
    }

    const creditsUsed = totalTrialCredits != null ? Math.max(totalTrialCredits - creditsRemaining, 0) : 0;

    return res.status(200).json(
      buildResponse({
        ok: true,
        trialActive,
        creditsRemaining,
        creditsUsed,
        minutesLeft,
        trialExpiresAt: null,
        isSubscribed,
        totalTrialCredits,
        reason: trialExpired ? 'TRIAL_EXPIRED' : null
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
        reason: err.name === 'AbortError' ? 'BACKEND_TIMEOUT' : 'UNEXPECTED_ERROR'
      })
    );
  }
}

