// frontend/pages/api/generate.js

import { createClient } from '@supabase/supabase-js';

const TRIAL_MINUTES = 10;      // trial duration in minutes
const TRIAL_CREDITS = 10;      // total credits in trial
const CREDITS_PER_GENERATE = 1;

// Lazy-created Supabase *service* client (server-side only)
let supabaseAdmin = null;

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Supabase env vars missing');
  }

  if (!supabaseAdmin) {
    supabaseAdmin = createClient(url, serviceKey);
  }

  return supabaseAdmin;
}

/**
 * Helper: compute diff in minutes between now and a timestamp
 */
function minutesSince(dateString) {
  if (!dateString) return Infinity;
  const start = new Date(dateString);
  const now = new Date();
  return (now.getTime() - start.getTime()) / (1000 * 60);
}

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res
      .status(405)
      .json({ ok: false, code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' });
  }

  const {
    email,
    userEmail,  // some parts of the frontend might send userEmail instead
    prompt,
    type,       // e.g. "lesson-plan", "quiz", "presentation"
    meta,       // extra data from the UI (subject, grade, etc.)
  } = req.body || {};

  const effectiveEmail = email || userEmail;

  if (!effectiveEmail) {
    return res.status(400).json({
      ok: false,
      code: 'EMAIL_REQUIRED',
      message: 'User email is required to track trial usage.',
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error('[GENERATE] OPENAI_API_KEY missing');
    return res.status(500).json({
      ok: false,
      code: 'OPENAI_CONFIG_MISSING',
      message: 'Server configuration error (OpenAI).',
    });
  }

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (e) {
    console.error('[GENERATE] Supabase config error:', e.message);
    return res.status(500).json({
      ok: false,
      code: 'SUPABASE_CONFIG_MISSING',
      message: 'Server configuration error (Supabase).',
    });
  }

  try {
    // 1️⃣ Load or create trial user row
    let { data: trialRow, error: selectError } = await supabase
      .from('trial_users')
      .select('*')
      .eq('email', effectiveEmail)
      .maybeSingle();

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('[GENERATE] Error loading trial user:', selectError);
      return res.status(500).json({
        ok: false,
        code: 'TRIAL_DB_ERROR',
        message: 'Error checking trial status.',
      });
    }

    if (!trialRow) {
      // First time user → create trial row
      const nowIso = new Date().toISOString();
      const { data: inserted, error: insertError } = await supabase
        .from('trial_users')
        .insert({
          email: effectiveEmail,
          trial_start: nowIso,
          credits_used: 0,
          trial_active: true,
        })
        .select()
        .maybeSingle();

      if (insertError) {
        console.error('[GENERATE] Error creating trial user:', insertError);
        return res.status(500).json({
          ok: false,
          code: 'TRIAL_CREATE_ERROR',
          message: 'Could not start trial for this user.',
        });
      }

      trialRow = inserted;
    }

    // 2️⃣ Compute trial status
    const elapsedMinutes = minutesSince(trialRow.trial_start);
    const creditsUsed = trialRow.credits_used || 0;
    const remainingCredits = Math.max(TRIAL_CREDITS - creditsUsed, 0);
    const isExpiredByTime = elapsedMinutes > TRIAL_MINUTES;
    const isOutOfCredits = remainingCredits < CREDITS_PER_GENERATE;
    const isActive = trialRow.trial_active !== false;

    // If trial not active or expired/out of credits → block
    if (!isActive || isExpiredByTime || isOutOfCredits) {
      // mark trial as inactive if needed
      if (isActive && (isExpiredByTime || isOutOfCredits)) {
        await supabase
          .from('trial_users')
          .update({ trial_active: false })
          .eq('email', effectiveEmail);
      }

      const reason = isExpiredByTime
        ? 'TRIAL_EXPIRED'
        : isOutOfCredits
        ? 'TRIAL_NO_CREDITS'
        : 'TRIAL_INACTIVE';

      return res.status(403).json({
        ok: false,
        code: reason,
        message:
          reason === 'TRIAL_EXPIRED'
            ? 'Your 10-minute trial has expired. Please subscribe to continue using TeachWise AI.'
            : 'Your trial credits are exhausted. Please subscribe to continue using TeachWise AI.',
        trial: {
          isTrialUser: true,
          minutesUsed: Math.round(elapsedMinutes),
          minutesTotal: TRIAL_MINUTES,
          remainingCredits,
          creditsUsed,
          totalCredits: TRIAL_CREDITS,
          active: false,
        },
      });
    }

    // 3️⃣ Charge 1 credit for this generate call (optimistic update)
    const newCreditsUsed = creditsUsed + CREDITS_PER_GENERATE;

    const { error: updateError } = await supabase
      .from('trial_users')
      .update({
        credits_used: newCreditsUsed,
      })
      .eq('email', effectiveEmail);

    if (updateError) {
      console.error('[GENERATE] Error updating credits:', updateError);
      // We continue anyway, but you might choose to block here.
    }

    const newRemaining = Math.max(TRIAL_CREDITS - newCreditsUsed, 0);

    // 4️⃣ Call OpenAI to actually generate content
    const finalPrompt =
      prompt ||
      `Generate teaching content of type "${type || 'lesson plan'}" based on the following details: ${JSON.stringify(
        meta || {}
      )}`;

    const openaiResponse = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                'You are TeachWise AI, an assistant that helps teachers generate lesson plans, quizzes, and presentations.',
            },
            { role: 'user', content: finalPrompt },
          ],
        }),
      }
    );

    if (!openaiResponse.ok) {
      const text = await openaiResponse.text().catch(() => '');
      console.error('[GENERATE] OpenAI error:', openaiResponse.status, text);

      return res.status(500).json({
        ok: false,
        code: 'OPENAI_ERROR',
        message: 'Error while generating content.',
        details: text?.slice(0, 500),
      });
    }

    const completion = await openaiResponse.json();
    const content =
      completion?.choices?.[0]?.message?.content ??
      'Sorry, I was unable to generate content.';

    // 5️⃣ Return success with remaining credits + trial info
    return res.status(200).json({
      ok: true,
      content,
      trial: {
        isTrialUser: true,
        totalCredits: TRIAL_CREDITS,
        remainingCredits: newRemaining,
        creditsUsed: newCreditsUsed,
        minutesUsed: Math.round(elapsedMinutes),
        minutesTotal: TRIAL_MINUTES,
        active: true,
      },
    });
  } catch (err) {
    console.error('[GENERATE] Unexpected error:', err);
    return res.status(500).json({
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'Unexpected error in generate endpoint.',
    });
  }
}
