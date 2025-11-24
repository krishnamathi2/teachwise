import React from 'react';
import { useTrial } from '../context/TrialContext';

export default function TrialBanner() {
  const { trial, loading } = useTrial();

  if (loading) return null;            // or show a skeleton

  if (!trial || !trial.isTrialUser) {
    return null;                       // not a trial user → show nothing
  }

  const {
    totalCredits,
    remainingCredits,
    creditsUsed,
    minutesTotal,
    minutesLeft,
    active,
  } = trial;

  if (!active || remainingCredits <= 0 || minutesLeft <= 0) {
    return (
      <div className="w-full bg-red-600 text-white text-sm py-2 px-4 flex items-center justify-between">
        <span>
          ⏳ Your 10-minute free trial has ended or credits are exhausted.
          Please subscribe to continue using TeachWise AI.
        </span>
        {/* You can add a “View Plans” button here */}
      </div>
    );
  }

  const lowCredits = remainingCredits <= 2;

  return (
    <div
      className={`w-full text-sm py-2 px-4 flex items-center justify-between ${
        lowCredits ? 'bg-amber-500 text-black' : 'bg-indigo-600 text-white'
      }`}
    >
      <span>
        ⏳ 10-minute free trial &nbsp;•&nbsp;
        <strong>{remainingCredits}</strong> credits left out of{' '}
        <strong>{totalCredits}</strong> &nbsp;•&nbsp;
        about <strong>{minutesLeft}</strong> min left
      </span>
      {lowCredits && (
        <span className="text-xs opacity-80">
          You’re running low on credits — generate wisely!
        </span>
      )}
    </div>
  );
}
