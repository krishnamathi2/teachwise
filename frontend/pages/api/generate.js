// frontend/pages/api/generate.js

import { createClient } from '@supabase/supabase-js';

const TRIAL_MINUTES = 10;      // trial duration
const TRIAL_CREDITS = 10;      // total credits in trial
const CREDITS_PER_GENERATE = 1;

// Supabase service client (server-side only!)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function minutesSince(dateString) {
  if (!dateString) return Infinity;
  const start = new Date(dateString);
  const now = new Date();
  return (now.getTime() - start.getTime()) / (1000 * 60);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res
      .status(405)
      .json({ ok: false, code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' });
  }

  const { email, userEmail, prompt, type, meta } = req.body || {};
  const effectiveEmail = email || userEmail;

  if (!effectiveEmail) {
    return res.status(400).json({
      ok: false,
      code: 'EMAIL_REQUIRED',
      message: 'User email is required to track trial usage.',
    });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('[GENERATE] Supabase env missing');
    return res.status(500).json({
      ok: false,
      code: 'SUPABASE_CONFIG_MISSING',
      message: 'Server configuration error (Supabase).',
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

  try {
    // 1) Load or create trial row
    let { data: trialRow, error: selectError } = await supabaseAdmin
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
      const nowIso = new Date().toISOString();
      const { data: inserted, error: insertError } = await supabaseAdmin
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

    // 2) Compute trial state
    const elapsedMinutes = minutesSince(trialRow.trial_start);
    const creditsUsed = trialRow.credits_used || 0;
    const remainingCredits = Math.max(TRIAL_CREDITS - creditsUsed, 0);
    const isExpiredByTime = elapsedMinutes > TRIAL_MINUTES;
    const isOutOfCredits = remainingCredits < CREDITS_PER_GENERATE;
    const isActive = trialRow.trial_active !== false;

    if (!isActive || isExpiredByTime || isOutOfCredits) {
      if (isActive && (isExpiredByTime || isOutOfCredits)) {
        await supabaseAdmin
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
          totalCredits: TRIAL_CREDITS,
          creditsUsed,
          active: false,
        },
      });
    }

    // 3) Charge 1 credit
    const newCreditsUsed = creditsUsed + CREDITS_PER_GENERATE;

    const { error: updateError } = await supabaseAdmin
      .from('trial_users')
      .update({ credits_used: newCreditsUsed })
      .eq('email', effectiveEmail);

    if (updateError) {
      console.error('[GENERATE] Error updating credits:', updateError);
      // we still continue
    }

    const newRemaining = Math.max(TRIAL_CREDITS - newCreditsUsed, 0);

    // 4) Call OpenAI
    const finalPrompt =
      prompt ||
      `Generate teaching content of type "${type || 'lesson plan'}" based on the following details: ${JSON.stringify(
        meta || {}
      )}`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
    });

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

    // 5) Return success
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
