// frontend/pages/api/generate.js

import { createClient } from "@supabase/supabase-js";

const TRIAL_MINUTES = 10;     // trial length
const TRIAL_CREDITS = 10;     // free credits
const CREDITS_PER_GENERATE = 1;

// Admin Supabase (server-side ONLY)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Helper: calculate minutes since a timestamp
function minutesSince(dateString) {
  if (!dateString) return Infinity;
  const start = new Date(dateString);
  const now = new Date();
  return (now - start) / 1000 / 60;
}

export default async function handler(req, res) {
  // Health check (OPTIONAL)
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      message: "Generate API is alive — POST required.",
    });
  }

  // Allow only POST for actual generate
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      ok: false,
      code: "METHOD_NOT_ALLOWED",
      message: "Use POST.",
    });
  }

  const { email, userEmail, prompt, type, meta } = req.body || {};
  const effectiveEmail = email || userEmail;

  if (!effectiveEmail) {
    return res.status(400).json({
      ok: false,
      code: "EMAIL_REQUIRED",
      message: "Email required.",
    });
  }

  // Env checks
  if (!process.env.SUPABASE_SERVICE_KEY) {
    console.error("Missing SUPABASE_SERVICE_KEY");
    return res.status(500).json({ ok: false, code: "SUPABASE_KEY_MISSING" });
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error("Missing OPENAI_API_KEY");
    return res.status(500).json({ ok: false, code: "OPENAI_KEY_MISSING" });
  }

  try {
    // 1️⃣ Load trial row
    let { data: trialUser, error: selectErr } = await supabaseAdmin
      .from("trial_users")
      .select("*")
      .eq("email", effectiveEmail)
      .maybeSingle();

    if (selectErr && selectErr.code !== "PGRST116") {
      console.error("Select error:", selectErr);
      return res.status(500).json({
        ok: false,
        code: "TRIAL_DB_ERROR",
        message: "Error loading trial status",
      });
    }

    // 2️⃣ If user doesn't exist → create trial row
    if (!trialUser) {
      const now = new Date().toISOString();
      const { data: created, error: insertErr } = await supabaseAdmin
        .from("trial_users")
        .insert({
          email: effectiveEmail,
          trial_start: now,
          credits_used: 0,
          trial_active: true,
        })
        .select()
        .maybeSingle();

      if (insertErr) {
        console.error("Insert error:", insertErr);
        return res
          .status(500)
          .json({ ok: false, code: "TRIAL_CREATE_ERROR" });
      }

      trialUser = created;
    }

    // 3️⃣ Check trial conditions
    const elapsed = minutesSince(trialUser.trial_start);
    const used = trialUser.credits_used || 0;
    const remaining = Math.max(TRIAL_CREDITS - used, 0);

    const expiredByTime = elapsed >= TRIAL_MINUTES;
    const noCredits = remaining < CREDITS_PER_GENERATE;
    const active = trialUser.trial_active !== false;

    if (!active || expiredByTime || noCredits) {
      // Deactivate if expired
      await supabaseAdmin
        .from("trial_users")
        .update({ trial_active: false })
        .eq("email", effectiveEmail);

      return res.status(403).json({
        ok: false,
        code: expiredByTime ? "TRIAL_EXPIRED" : "TRIAL_NO_CREDITS",
        message:
          expiredByTime
            ? "Your 10-minute trial has expired. Please subscribe."
            : "Your trial credits are exhausted. Please subscribe.",
        trial: {
          isTrialUser: true,
          active: false,
          minutesUsed: Math.round(elapsed),
          remainingCredits: remaining,
          totalCredits: TRIAL_CREDITS,
        },
      });
    }

    // 4️⃣ Charge 1 credit
    const newUsed = used + CREDITS_PER_GENERATE;

    const { error: updateErr } = await supabaseAdmin
      .from("trial_users")
      .update({ credits_used: newUsed })
      .eq("email", effectiveEmail);

    if (updateErr) {
      console.error("Update credit error:", updateErr);
    }

    // 5️⃣ Build prompt for OpenAI
    const finalPrompt =
      prompt ||
      `Generate a teaching resource of type "${type || "lesson-plan"}". Additional details: ${JSON.stringify(
        meta || {}
      )}`;

    // 6️⃣ Call OpenAI
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are TeachWise AI — an assistant for teachers generating lesson plans, quizzes, and presentations.",
          },
          { role: "user", content: finalPrompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error("OpenAI error:", aiRes.status, text);
      return res.status(500).json({
        ok: false,
        code: "OPENAI_ERROR",
        message: "OpenAI generation failed",
        details: text,
      });
    }

    const json = await aiRes.json();
    const content =
      json?.choices?.[0]?.message?.content ||
      "Unable to generate teaching content.";

    // 7️⃣ Return output + trial info
    return res.status(200).json({
      ok: true,
      content,
      trial: {
        isTrialUser: true,
        active: true,
        minutesUsed: Math.round(elapsed),
        minutesTotal: TRIAL_MINUTES,
        creditsUsed: newUsed,
        remainingCredits: Math.max(TRIAL_CREDITS - newUsed, 0),
        totalCredits: TRIAL_CREDITS,
      },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Internal server error",
    });
  }
}
