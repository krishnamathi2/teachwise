import React, { useEffect, useState } from "react";

type TrialInfo = {
  isTrialUser: boolean;
  active: boolean;
  minutesUsed: number;
  minutesTotal: number;
  creditsUsed: number;
  remainingCredits: number;
  totalCredits: number;
};

type TrialStatusResponse =
  | {
      ok: true;
      trial: TrialInfo;
      code?: string;
      message?: string;
    }
  | {
      ok: false;
      code: string;
      message: string;
      trial?: TrialInfo;
    };

function formatMinutesLeft(minutesTotal: number, minutesUsed: number) {
  const left = Math.max(minutesTotal - minutesUsed, 0);
  if (left <= 0) return "0 min left";
  if (left === 1) return "1 min left";
  return `${left} mins left`;
}

export const TrialStatusBanner: React.FC = () => {
  const [trial, setTrial] = useState<TrialInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function fetchStatus() {
    try {
      setErrorMsg(null);
      const res = await fetch("/api/trial-status");
      const data: TrialStatusResponse = await res.json();

      if (!data.ok) {
        setErrorMsg(data.message || "Unable to check trial.");
        if (data.trial) setTrial(data.trial);
        return;
      }

      setTrial(data.trial);
    } catch (err) {
      console.error("[TrialStatusBanner] fetch error", err);
      setErrorMsg("Network error while checking trial.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // initial load
    fetchStatus();

    // refresh every 30 seconds so timer/credits stay fresh
    const id = setInterval(fetchStatus, 30_000);
    return () => clearInterval(id);
  }, []);

  if (loading && !trial) return null; // don’t flash

  if (!trial || !trial.isTrialUser) {
    // For non-trial users you might not want to show anything here
    return null;
  }

  const minutesLabel = formatMinutesLeft(
    trial.minutesTotal ?? 10,
    trial.minutesUsed ?? 0
  );

  const creditsLabel = `${trial.remainingCredits}/${trial.totalCredits} credits left`;

  const isActive = trial.active && trial.remainingCredits > 0;

  const bgClass = isActive ? "bg-indigo-600" : "bg-red-600";
  const textClass = "text-white";

  return (
    <div className={`${bgClass} ${textClass} rounded-xl px-4 py-3 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between shadow-lg`}>
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center justify-center rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide">
          ⏳ Trial {isActive ? "Active" : "Ended"}
        </span>
        <span className="text-sm sm:text-base font-medium">
          {minutesLabel} • {creditsLabel}
        </span>
      </div>

      <div className="mt-2 sm:mt-0 flex items-center gap-3 text-xs sm:text-sm">
        {errorMsg && (
          <span className="text-white/80">
            ⚠ {errorMsg}
          </span>
        )}
        {!isActive && (
          <a
            href="#pricing" // update to your pricing/upgrade section id or /pricing page
            className="inline-flex items-center rounded-lg bg-white px-3 py-1.5 text-xs sm:text-sm font-semibold text-indigo-700 hover:bg-indigo-50 transition"
          >
            Upgrade to keep using TeachWise AI →
          </a>
        )}
      </div>
    </div>
  );
};
