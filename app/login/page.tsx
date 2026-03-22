"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { signInWithPopup } from "firebase/auth";
import { cn } from "@/lib/utils";
import { getFirebaseAuth, googleAuthProvider } from "@/lib/firebase-client";

function LoginInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const e = searchParams.get("error");
    setError(e);
  }, [searchParams]);

  const returnTo = searchParams.get("returnTo") || "/";

  async function handleGoogleSignIn() {
    setError(null);
    setBusy(true);
    try {
      const auth = getFirebaseAuth();
      const credential = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await credential.user.getIdToken();
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; isNew?: boolean };
      if (!res.ok) {
        throw new Error(data.error || "Could not create session");
      }
      await auth.signOut();
      if (data.isNew) {
        router.push("/onboarding");
      } else {
        router.push(returnTo);
      }
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Sign-in failed. Try again.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-primary)] px-4 text-[var(--text-primary)]">
      <div className="w-full max-w-md">
        {/* Hero / branding */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-primary)]" style={{ boxShadow: "var(--glow-primary)" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="var(--bubble-sender-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Chat2meet</h1>
          <p className="mt-2 text-[15px] text-[var(--text-secondary)]">
            Schedule meetings through conversation
          </p>
        </div>

        {/* Features */}
        <div className="mb-8 flex flex-col gap-3">
          <div className="flex items-start gap-3 rounded-xl bg-[var(--bg-secondary)] px-4 py-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--bubble-action)] text-[var(--text-link)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Chat to schedule</p>
              <p className="text-xs text-[var(--text-tertiary)]">Just tell the AI who you want to meet — it handles the rest</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-[var(--bg-secondary)] px-4 py-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--bubble-action)] text-[var(--text-link)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2" />
                <path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Google Calendar sync</p>
              <p className="text-xs text-[var(--text-tertiary)]">Connects to your calendar to find free times automatically</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-[var(--bg-secondary)] px-4 py-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--bubble-action)] text-[var(--text-link)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="7" cy="8" r="2.5" stroke="currentColor" strokeWidth="2" />
                <circle cx="17" cy="8" r="2.5" stroke="currentColor" strokeWidth="2" />
                <circle cx="12" cy="17" r="2.5" stroke="currentColor" strokeWidth="2" />
                <path d="M9.5 10l2.5 5M14.5 10l-2.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Private preferences</p>
              <p className="text-xs text-[var(--text-tertiary)]">Set hidden rules like "no meetings before 10 AM" that the agent respects</p>
            </div>
          </div>
        </div>

        {/* Sign-in card */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-6 shadow-[var(--shadow-card)]">
          {error && (
            <div
              className="mb-4 rounded-lg border border-[var(--accent-danger)]/40 bg-[var(--accent-danger)]/10 px-3 py-2 text-sm text-[var(--accent-danger)]"
              role="alert"
            >
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={busy}
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-base font-semibold tracking-[-0.2px] transition-opacity duration-150",
              "bg-[var(--accent-primary)] text-[var(--bubble-sender-text)] shadow-[var(--glow-soft)] hover:opacity-90",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focused)]",
              "disabled:pointer-events-none disabled:opacity-40",
            )}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {busy ? "Signing in…" : "Continue with Google"}
          </button>

          <p className="mt-4 text-center text-xs text-[var(--text-tertiary)]">
            Sign in to start scheduling with your friends
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] text-[var(--text-tertiary)]">
          Loading…
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
