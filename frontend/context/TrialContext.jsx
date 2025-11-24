import React, { createContext, useContext, useState, useEffect } from 'react';

const TrialContext = createContext({
  trial: null,
  setTrial: () => {},
  loading: true,
});

export function TrialProvider({ children }) {
  const [trial, setTrial] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔁 Load trial status once when the app mounts
  useEffect(() => {
    async function fetchTrialStatus() {
      try {
        const res = await fetch('/api/trial-status');
        const data = await res.json();

        if (!data?.ok) {
          setTrial(null);
          return;
        }

        const expiresAt = data.trialExpiresAt ? new Date(data.trialExpiresAt) : null;
        const minutesTotal = data.trialMinutes ?? 0;
        const minutesLeft = data.minutesLeft ?? minutesTotal;

        const endedReasons = new Set([
          'TRIAL_TIME_EXPIRED',
          'TRIAL_CREDITS_EXHAUSTED'
        ]);
        const isTrialUser = Boolean(data.trialActive) || endedReasons.has(data.reason);

        const trialShape = {
          active: Boolean(data.trialActive),
          isTrialUser,
          totalCredits: data.totalTrialCredits ?? data.credits ?? 0,
          remainingCredits: data.creditsRemaining ?? data.credits ?? 0,
          creditsUsed: data.creditsUsed ?? 0,
          minutesTotal,
          minutesLeft,
          expiresAt,
          reason: data.reason ?? null
        };

        setTrial(trialShape);
      } catch (err) {
        console.error('Error loading trial status', err);
        setTrial(null);
      } finally {
        setLoading(false);
      }
    }

    fetchTrialStatus();
  }, []);

  return (
    <TrialContext.Provider value={{ trial, setTrial, loading }}>
      {children}
    </TrialContext.Provider>
  );
}

export function useTrial() {
  return useContext(TrialContext);
}
