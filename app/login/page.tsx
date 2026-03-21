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
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-8 shadow-[var(--shadow-card)]">
        <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Continue with Google (Firebase Authentication).
        </p>

        {error && (
          <div
            className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="mt-8">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={busy}
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-base font-semibold tracking-[-0.2px] transition-opacity duration-150",
              "bg-[var(--accent-primary)] text-white shadow-[var(--glow-soft)] hover:opacity-90",
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
        </div>

        <p className="mt-6 text-center text-xs text-[var(--text-tertiary)]">
          <Link href="/" className="text-[var(--text-link)] hover:underline">
            Back to app
          </Link>
        </p>
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
