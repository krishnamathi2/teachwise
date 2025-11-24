// frontend/pages/index.tsx

import { useEffect, useState } from 'react';
import type { NextPage } from 'next';

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

const HomePage: NextPage = () => {
  const [email, setEmail] = useState<string>('');
  const [credits, setCredits] = useState<number>(0);
  const [isTrialUser, setIsTrialUser] = useState<boolean>(true);

  const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null);
  const [trialLoading, setTrialLoading] = useState<boolean>(true);
  const [trialError, setTrialError] = useState<string | null>(null);

  const [prompt, setPrompt] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Load trial status on first load
  useEffect(() => {
    const fetchTrialStatus = async () => {
      try {
        setTrialLoading(true);
        setTrialError(null);

        const res = await fetch('/api/trial-status');
        const data = await res.json();

        if (!res.ok || !data.ok) {
          setTrialError(data?.message || 'Unable to load trial status');
          setTrialInfo(null);
          return;
        }

        const trial: TrialInfo = data.trial;

        setTrialInfo(trial);
        setIsTrialUser(trial.isTrialUser);
        setCredits(trial.remainingCredits ?? 0);
      } catch (err: any) {
        console.error('Error loading trial status', err);
        setTrialError('Unable to load trial status');
      } finally {
        setTrialLoading(false);
      }
    };

    fetchTrialStatus();
  }, []);

  // Simple helper for the subtitle under the email pill
  const creditsLabel = (() => {
    if (trialInfo && !trialInfo.active) {
      return 'Trial ended – please subscribe';
    }
    if (credits <= 0) return 'Very low credits!';
    if (credits <= 2) return 'Running low on credits!';
    return 'You are on your free trial';
  })();

  const handleGenerate = async (type: 'lesson' | 'quiz' | 'presentation') => {
    setGenerateError(null);

    if (!email) {
      setGenerateError('Please enter your email before using TeachWise AI.');
      return;
    }

    // Block if trial has ended
    if (trialInfo && (!trialInfo.active || trialInfo.remainingCredits <= 0)) {
      setGenerateError(
        'Your free trial has ended. Please subscribe to continue using TeachWise AI.'
      );
      return;
    }

    try {
      setIsGenerating(true);
      setOutput('');

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          type,
          prompt,
          meta: {},
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        // If backend says trial over, update trial info + credits
        if (data.trial) {
          const trial: TrialInfo = data.trial;
          setTrialInfo(trial);
          setCredits(trial.remainingCredits ?? 0);
        }

        setGenerateError(
          data?.message ||
            'Unable to generate content. Please try again or contact support.'
        );
        return;
      }

      setOutput(data.content ?? '');

      if (data.trial) {
        const trial: TrialInfo = data.trial;
        setTrialInfo(trial);
        setCredits(trial.remainingCredits ?? 0);
      }
    } catch (err: any) {
      console.error('Error in generate', err);
      setGenerateError('Unexpected error while generating content.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Compute trial banner text + colors
  const renderTrialBanner = () => {
    if (trialLoading) {
      return (
        <div className="mt-2 text-xs text-gray-300">
          Checking free trial status…
        </div>
      );
    }

    if (trialError) {
      return (
        <div className="mt-2 text-xs text-red-300">
          {trialError}
        </div>
      );
    }

    if (!trialInfo) return null;

    const remainingMinutes = Math.max(
      (trialInfo.minutesTotal || 10) - (trialInfo.minutesUsed || 0),
      0
    );

    const baseClasses =
      'rounded-lg px-4 py-3 text-xs sm:text-sm border mt-2';

    let colorClasses =
      'bg-emerald-900/40 border-emerald-500/70 text-emerald-50';
    if (!trialInfo.active || trialInfo.remainingCredits <= 0) {
      colorClasses = 'bg-red-900/40 border-red-500/60 text-red-100';
    } else if (trialInfo.remainingCredits <= 2) {
      colorClasses = 'bg-amber-900/40 border-amber-400/70 text-amber-50';
    }

    return (
      <div className={`${baseClasses} ${colorClasses}`}>
        <div className="font-semibold flex items-center gap-2">
          <span>⚡ 10-minute free trial</span>
          {trialInfo.active ? (
            <span className="rounded-full bg-black/30 px-2 py-0.5 text-[0.7rem] uppercase tracking-wide">
              Active
            </span>
          ) : (
            <span className="rounded-full bg-black/30 px-2 py-0.5 text-[0.7rem] uppercase tracking-wide">
              Ended
            </span>
          )}
        </div>

        <div className="mt-1">
          {trialInfo.active && trialInfo.remainingCredits > 0 ? (
            <>
              <span>
                Credits left:{' '}
                <strong>
                  {trialInfo.remainingCredits} / {trialInfo.totalCredits}
                </strong>
              </span>
              {' · '}
              <span>
                Time left:{' '}
                <strong>{remainingMinutes} min</strong>
              </span>
            </>
          ) : (
            <span>
              Your free trial has ended. Please subscribe to continue using
              TeachWise AI.
            </span>
          )}
        </div>

        <div className="mt-2 h-1.5 w-full bg-black/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-400"
            style={{
              width: `${
                (trialInfo.remainingCredits / trialInfo.totalCredits) * 100
              }%`,
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-blue-500 to-purple-600 text-white">
      <div className="max-w-5xl mx-auto px-4 py-6 md:py-10">
        {/* Top bar */}
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">
            TeachWise.ai
          </h1>
          <button
            className="text-xs px-3 py-1 rounded-full bg-black/30 hover:bg-black/40"
            type="button"
          >
            🌙 Dark
          </button>
        </header>

        {/* Main card */}
        <main className="bg-white/5 border border-white/10 rounded-3xl shadow-xl p-4 md:p-6 backdrop-blur">
          {/* Email + credits bar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  className="px-3 py-1.5 rounded-full bg-black/20 border border-white/20 text-xs md:text-sm outline-none min-w-[260px]"
                  placeholder="Enter your email to start trial"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <span className="px-3 py-1 rounded-full bg-black/30 text-xs">
                  {credits} credits
                </span>
                {isTrialUser && (
                  <span className="px-3 py-1 rounded-full bg-purple-500/80 text-xs">
                    ⏱ Trial User
                  </span>
                )}
              </div>
              <div className="text-[0.7rem] md:text-xs text-yellow-200 mt-1">
                {creditsLabel}
              </div>
              {renderTrialBanner()}
            </div>

            <button
              type="button"
              className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-xs md:text-sm font-semibold shadow-md"
            >
              🔥 Add Credits to Continue
            </button>
          </div>

          {/* Tools list */}
          <section className="mt-4 grid md:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => handleGenerate('lesson')}
              disabled={isGenerating}
              className="text-left bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 transition flex flex-col gap-1"
            >
              <div className="font-semibold text-sm flex items-center gap-2">
                <span>📚 Lesson Plan</span>
              </div>
              <p className="text-xs text-white/80">
                Generate structured lesson plans in seconds.
              </p>
              <div className="mt-2 text-[0.7rem] text-emerald-200">
                4 credits
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleGenerate('quiz')}
              disabled={isGenerating}
              className="text-left bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 transition flex flex-col gap-1"
            >
              <div className="font-semibold text-sm flex items-center gap-2">
                <span>❓ Quiz</span>
              </div>
              <p className="text-xs text-white/80">
                Auto-generate MCQs, short answer, and more.
              </p>
              <div className="mt-2 text-[0.7rem] text-emerald-200">
                4 credits
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleGenerate('presentation')}
              disabled={isGenerating}
              className="text-left bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 transition flex flex-col gap-1"
            >
              <div className="font-semibold text-sm flex items-center gap-2">
                <span>📊 Presentation</span>
              </div>
              <p className="text-xs text-white/80">
                Slide-ready content for your classroom.
              </p>
              <div className="mt-2 text-[0.7rem] text-emerald-200">
                4 credits
              </div>
            </button>
          </section>

          {/* Prompt & output */}
          <section className="mt-6 grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs mb-1 text-white/80">
                Topic / instructions
              </label>
              <textarea
                className="w-full min-h-[140px] rounded-2xl bg-black/20 border border-white/15 text-xs md:text-sm p-3 outline-none"
                placeholder="e.g. Grade 7 Physics – Laws of Motion, 40-minute lesson..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              {generateError && (
                <div className="mt-2 text-[0.7rem] text-red-300">
                  {generateError}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs mb-1 text-white/80">
                Output
              </label>
              <div className="w-full min-h-[140px] rounded-2xl bg-black/10 border border-white/10 text-xs md:text-sm p-3 whitespace-pre-wrap">
                {isGenerating
                  ? 'Generating content…'
                  : output || 'Generated content will appear here.'}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default HomePage;
