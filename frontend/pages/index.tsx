import React, { useEffect, useState } from "react";
import { TrialStatusBanner } from "../components/TrialStatusBanner";

type TrialInfo = {
  isTrialUser: boolean;
  active: boolean;
  minutesUsed: number;
  minutesTotal: number;
  creditsUsed: number;
  remainingCredits: number;
  totalCredits: number;
};

export default function HomePage() {
  const [email, setEmail] = useState<string>("");
  const [credits, setCredits] = useState<number>(0);
  const [isTrialUser, setIsTrialUser] = useState<boolean>(false);

  // Load credits + trial status
  async function loadStatus() {
    try {
      const res = await fetch("/api/trial-status");
      const data = await res.json();

      if (data.ok && data.trial) {
        setCredits(data.trial.remainingCredits);
        setIsTrialUser(true);
      } else {
        // For subscribed users fetch credits differently if needed
        setIsTrialUser(false);
      }
    } catch (err) {
      console.error("Error loading trial:", err);
    }
  }

  // Load authenticated user (Supabase)
  useEffect(() => {
    async function getUser() {
      try {
        const { user } = await (await fetch("/api/get-user")).json();
        if (user?.email) setEmail(user.email);

        loadStatus();
      } catch {
        console.log("Could not load user.");
      }
    }
    getUser();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-sky-500 to-purple-600 text-white">

      {/* TOP NAV */}
      <header className="w-full px-6 py-4 flex items-center justify-between bg-white/10 backdrop-blur-xl shadow-lg">
        <h1 className="text-2xl font-bold">TeachWise.ai</h1>

        <div className="flex items-center gap-3">
          {email && (
            <span className="px-3 py-1 rounded-lg bg-white/20 text-sm font-medium">
              {email}
            </span>
          )}

          <button
            className="px-4 py-2 bg-red-500 rounded-lg hover:bg-red-600 transition"
            onClick={() => (window.location.href = "/auth/signout")}
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">

        {/* ⏳ TRIAL STATUS BANNER */}
        <TrialStatusBanner />

        {/* ⭐ CREDITS BAR */}
        <div className="bg-white/20 backdrop-blur-md rounded-2xl px-6 py-4 shadow-lg mb-6">
          <div className="flex items-center justify-between">
            <div className="text-xl font-bold">{credits} credits</div>

            {isTrialUser && (
              <span className="px-3 py-1 rounded-xl bg-purple-600 text-sm">
                Trial User
              </span>
            )}

            <button
              className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 transition"
              onClick={() => (window.location.href = "/pricing")}
            >
              + Add Credits
            </button>
          </div>

          {/* Low credit warning */}
          {credits <= 2 && (
            <div className="mt-3 text-yellow-300 font-medium">
              ⚠ Very low credits!
            </div>
          )}
        </div>

        {/* 📘 TOOLS */}
        <div className="space-y-4">
          <ToolItem title="Lesson Plan" credits={4} />
          <ToolItem title="Quiz" credits={4} />
          <ToolItem title="Presentation" credits={4} />
        </div>

        {/* FOOTER */}
        <footer className="mt-12 text-center text-white/80">
          Create engaging lesson plans and quizzes in seconds with AI.
        </footer>
      </main>
    </div>
  );
}

/* Tool Card Component */
function ToolItem({ title, credits }: { title: string; credits: number }) {
  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl px-6 py-4 flex justify-between items-center shadow-lg hover:bg-white/20 transition cursor-pointer">
      <div className="font-semibold text-lg">{title}</div>
      <div className="text-sm text-white/70">{credits} credits</div>
    </div>
  );
}
