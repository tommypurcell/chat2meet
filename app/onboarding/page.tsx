"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export default function OnboardingPage() {
  const [step, setStep] = useState<"signup" | "calendar">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setStep("calendar");
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--bg-primary)] px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo & Tagline */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-primary)] shadow-[var(--glow-primary)]">
            <CalendarLogoIcon />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            When2Meet
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Find the perfect time to meet, effortlessly.
          </p>
        </div>

        {step === "signup" ? (
          <SignUpForm
            name={name}
            email={email}
            password={password}
            onNameChange={setName}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onSubmit={handleCreateAccount}
          />
        ) : (
          <CalendarConnectStep />
        )}

        {/* Footer link */}
        <p className="mt-6 text-center text-sm text-[var(--text-tertiary)]">
          {step === "signup" ? (
            <>
              Already have an account?{" "}
              <Link
                href="#"
                className="font-medium text-[var(--text-link)] hover:opacity-80 transition-opacity"
              >
                Sign in
              </Link>
            </>
          ) : (
            <>
              Step 1 of 2 &middot;{" "}
              <Link
                href="/onboarding/preferences"
                className="font-medium text-[var(--text-link)] hover:opacity-80 transition-opacity"
              >
                Next: Set preferences
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sign-up form (no hooks, leaf component)                           */
/* ------------------------------------------------------------------ */

function SignUpForm({
  name,
  email,
  password,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: {
  name: string;
  email: string;
  password: string;
  onNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-5 p-6">
        {/* Google button */}
        <button
          type="button"
          className={cn(
            "flex w-full items-center justify-center gap-3 rounded-xl border-[1.5px] border-[var(--border)] bg-[var(--bg-tertiary)]",
            "px-5 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition-opacity hover:opacity-80",
          )}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        {/* OR divider */}
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-[var(--divider)]" />
          <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
            or
          </span>
          <span className="h-px flex-1 bg-[var(--divider)]" />
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="space-y-3.5">
          <InputField
            label="Name"
            type="text"
            placeholder="Your full name"
            value={name}
            onChange={onNameChange}
          />
          <InputField
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={onEmailChange}
          />
          <InputField
            label="Password"
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={onPasswordChange}
          />

          <Button type="submit" size="lg" className="mt-2 w-full">
            Create account
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Calendar connect step (no hooks, leaf component)                  */
/* ------------------------------------------------------------------ */

function CalendarConnectStep() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col items-center p-8 text-center">
        {/* Calendar illustration placeholder */}
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--bg-tertiary)]">
          <svg
            className="h-10 w-10 text-[var(--accent-primary)]"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <rect
              x="3"
              y="4"
              width="18"
              height="18"
              rx="3"
              stroke="currentColor"
              strokeWidth="1.75"
            />
            <path
              d="M3 9h18"
              stroke="currentColor"
              strokeWidth="1.75"
            />
            <path
              d="M8 2v4M16 2v4"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
            <circle cx="12" cy="15" r="2" fill="currentColor" />
          </svg>
        </div>

        <h2 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
          Connect your Google Calendar
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
          We&apos;ll check your availability automatically so you never have to
          fill in a grid again.
        </p>

        <div className="mt-6 flex w-full flex-col gap-2.5">
          <Button size="lg" className="w-full gap-2">
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <rect
                x="3"
                y="4"
                width="18"
                height="18"
                rx="3"
                stroke="currentColor"
                strokeWidth="1.75"
              />
              <path d="M3 9h18" stroke="currentColor" strokeWidth="1.75" />
              <path
                d="M8 2v4M16 2v4"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
            Connect Calendar
          </Button>
          <Link href="/onboarding/preferences">
            <Button variant="ghost" size="lg" className="w-full">
              Skip for now
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared presentational helpers                                     */
/* ------------------------------------------------------------------ */

function InputField({
  label,
  type,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
        {label}
      </span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "block w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-2.5 text-sm text-[var(--text-primary)]",
          "placeholder:text-[var(--input-placeholder)]",
          "focus:border-[var(--border-focused)] focus:outline-none focus:ring-2 focus:ring-[var(--border-focused)]/25",
          "transition-colors",
        )}
      />
    </label>
  );
}

function CalendarLogoIcon() {
  return (
    <svg className="h-7 w-7 text-white" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3"
        y="4"
        width="18"
        height="18"
        rx="3"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M3 9h18" stroke="currentColor" strokeWidth="2" />
      <path
        d="M8 2v4M16 2v4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
