"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { SAMPLE_INVITE } from "@/lib/mock-data";

export default function JoinPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  React.use(params);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const invite = SAMPLE_INVITE;

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[var(--bg-primary)] px-4 py-8">
      {/* Invite context card */}
      <Card className="mb-6 w-full max-w-md">
        <CardContent className="flex items-center gap-3 py-4">
          <Avatar name={invite.organizer} size={36} />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--text-primary)]">{invite.organizer}</span>
              {" "}invited you to:
            </p>
            <p className="truncate text-[15px] font-semibold text-[var(--text-primary)]">
              {invite.title}
              <span className="ml-1.5 font-normal text-[var(--text-tertiary)]">
                {" "}Tue {invite.time.split(" ")[0]} PM
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Sign-up form */}
      <Card className="w-full max-w-md">
        <CardContent className="space-y-5 px-6 py-6">
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
              Join When2Meet to respond
            </h1>
            <p className="mt-1 text-sm text-[var(--text-tertiary)]">
              Create an account to accept or propose a new time
            </p>
          </div>

          <div className="space-y-3">
            {/* Name */}
            <div>
              <label
                htmlFor="join-name"
                className="mb-1 block text-sm font-medium text-[var(--text-secondary)]"
              >
                Name
              </label>
              <input
                id="join-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-2.5 text-[15px] text-[var(--text-primary)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--border-focused)] focus:outline-none focus:ring-2 focus:ring-[var(--border-focused)]/20"
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="join-email"
                className="mb-1 block text-sm font-medium text-[var(--text-secondary)]"
              >
                Email
              </label>
              <input
                id="join-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-2.5 text-[15px] text-[var(--text-primary)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--border-focused)] focus:outline-none focus:ring-2 focus:ring-[var(--border-focused)]/20"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="join-password"
                className="mb-1 block text-sm font-medium text-[var(--text-secondary)]"
              >
                Password
              </label>
              <input
                id="join-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-2.5 text-[15px] text-[var(--text-primary)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--border-focused)] focus:outline-none focus:ring-2 focus:ring-[var(--border-focused)]/20"
              />
            </div>
          </div>

          {/* CTA */}
          <Button variant="primary" size="lg" className="w-full">
            Create account & respond
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-[var(--divider)]" />
            <span className="text-xs text-[var(--text-tertiary)]">or</span>
            <div className="h-px flex-1 bg-[var(--divider)]" />
          </div>

          {/* Google button */}
          <Button variant="secondary" size="lg" className="w-full">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
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
            Continue with Google
          </Button>

          {/* Footer link */}
          <p className="text-center text-sm text-[var(--text-tertiary)]">
            Already have an account?{" "}
            <a
              href="#"
              className="font-medium text-[var(--text-link)] hover:underline"
            >
              Sign in
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
