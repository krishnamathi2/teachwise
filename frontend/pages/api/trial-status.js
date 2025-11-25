// frontend/pages/api/trial-status.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const TRIAL_MINUTES = 10;
const TRIAL_CREDITS = 10;

type TrialInfo = {
  isTrialUser: boolean;
  totalCredits: number;
  remainingCredits: number;
  creditsUsed: number;
  minutesUsed: number;
  minutesTotal: number;
  active: boolean;
  statusCode?: string;
};

type TrialStatusResponse =
  | { ok: true; trial: TrialInfo; message?: string }
  | { ok: false; code: string; message: string };

function minutesSince(dateString?: string | null): number {
  if (!dateString) return 0;
  const start = new Date(dateString);
  const now = new Date();
  return (now.getTime() - start.getTime()) / (1000 * 60);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TrialStatusResponse>
) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({
      ok: false,
      code: 'METHOD_NOT_ALLOWED',
      message: 'Use GET or POST.',
    });
  }

  const email =
    (req.method === 'GET'
      ? (req.query.email as string | undefined)
      : (req.body?.email as string | undefined)) || '';

  const hasSupabaseEnv =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.SUPABASE_SERVICE_KEY;

  // ✅ Helper: return a safe default trial object (no error)
  const defaultTrial: TrialInfo = {
    isTrialUser: true,
    totalCredits: TRIAL_CREDITS,
    remainingCredits: TRIAL_CREDITS,
    creditsUsed: 0,
    minutesUsed: 0,
    minutesTotal: TRIAL_MINUTES,
    active: true,
  };

  // ✅ If no email yet: DO NOT treat as error – just return default trial.
  if (!email) {
    return res.status(200).json({
      ok: true,
      trial: {
        ...defaultTrial,
        statusCode: 'NO_EMAIL_YET',
      },
      message: 'Trial will start after first generate for this email.',
    });
  }

  // ✅ If Supabase is not configured, still return a valid trial (no error)
  if (!hasSupabaseEnv) {
    console.warn('[TRIAL-STATUS] Supabase env missing – using default trial');
    return res.status(200).json({
      ok: true,
      trial: {
        ...defaultTrial,
        statusCode: 'NO_DB_FALLBACK',
      },
      message: 'Using fallback trial (database not configured).',
    });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  try {
    // 1️⃣ Try to load existing trial row
    let { data: trialRow, error: selectError } = await supabase
      .from('trial_users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('[TRIAL-STATUS] Error loading trial user:', selectError);
      // Still return fallback – no UI error
      return res.status(200).json({
        ok: true,
        trial: {
          ...defaultTrial,
          statusCode: 'DB_ERROR_FALLBACK',
        },
        message: 'Using fallback trial (database error).',
      });
    }

    // 2️⃣ If no row → create trial row starting now
    if (!trialRow) {
      const nowIso = new Date().toISOString();
      const { data: inserted, error: insertError } = await supabase
        .from('trial_users')
        .insert({
          email,
          trial_start: nowIso,
          credits_used: 0,
          trial_active: true,
        })
        .select()
        .maybeSingle();

      if (insertError) {
        console.error(
          '[TRIAL-STATUS] Error creating trial user, fallback:',
          insertError
        );
        return res.status(200).json({
          ok: true,
          trial: {
            ...defaultTrial,
            statusCode: 'INSERT_ERROR_FALLBACK',
          },
          message: 'Using fallback trial (could not create trial record).',
        });
      }

      trialRow = inserted;
    }

    // 3️⃣ Compute status from DB row
    const minutesUsed = minutesSince(trialRow.trial_start);
    const creditsUsed = trialRow.credits_used || 0;
    const remainingCredits = Math.max(TRIAL_CREDITS - creditsUsed, 0);

    const isExpiredByTime = minutesUsed > TRIAL_MINUTES;
    const isOutOfCredits = remainingCredits <= 0;
    const active = !isExpiredByTime && !isOutOfCredits && trialRow.trial_active !== false;

    const trial: TrialInfo = {
      isTrialUser: true,
      totalCredits: TRIAL_CREDITS,
      remainingCredits,
      creditsUsed,
      minutesUsed: Math.round(minutesUsed),
      minutesTotal: TRIAL_MINUTES,
      active,
      statusCode: active ? 'ACTIVE' : isOutOfCredits ? 'NO_CREDITS' : 'EXPIRED',
    };

    return res.status(200).json({
      ok: true,
      trial,
    });
  } catch (err) {
    console.error('[TRIAL-STATUS] Unexpected error:', err);
    // Still do NOT break the UI
    return res.status(200).json({
      ok: true,
      trial: {
        ...defaultTrial,
        statusCode: 'UNEXPECTED_ERROR_FALLBACK',
      },
      message: 'Using fallback trial (unexpected error).',
    });
  }
}
    const newCreditsUsed = creditsUsed + CREDITS_PER_GENERATE;
    0);
-0);
 --- IGNORE ---       
    const newCreditsUsed = creditsUsed + CREDITS_PER_GENERATE;
    0);
-0);  

    const newCreditsUsed = creditsUsed + CREDITS_PER_GENERATE;
    0);
-0);  
    return res.status(500).json({
          ok: false,
          code: 'TRIAL_UPDATE_ERROR',
          message: 'Could not update trial usage.',
        });
    }     

    return res.status(200).json({
      ok: true,
      trial: {          

        isTrialUser: true,
        totalCredits: TRIAL_CREDITS,
        remainingCredits: remainingCredits - CREDITS_PER_GENERATE,  
        creditsUsed: newCreditsUsed,
        minutesUsed: Math.round(elapsedMinutes),
        minutesTotal: TRIAL_MINUTES,
        active: true, 
      },
    });
  } catch (err) { 
    console.error('Error in /api/generate:', err);
    return res.status(500).json({
      ok: false,
      code: 'INTERNAL_SERVER_ERROR',  
      message: 'An unexpected error occurred.',
    });
  }
}      .eq('email', effectiveEmail);
    if (updateError) {
      return res.status(500).json({
        ok: false,
        code: 'TRIAL_UPDATE_ERROR',
        message: 'Could not update trial usage.',
      });
    }       
    return res.status(200).json({
      ok: true,
      trial: {          
        isTrialUser: true,  
        totalCredits: TRIAL_CREDITS,
        remainingCredits: remainingCredits - CREDITS_PER_GENERATE,  
        creditsUsed: newCreditsUsed,
        minutesUsed: Math.round(elapsedMinutes),  

        minutesTotal: TRIAL_MINUTES,
        active: true, 
      },            

    });
    