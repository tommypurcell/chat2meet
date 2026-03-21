"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useTheme } from "@/lib/theme";

const MOCK_USER = {
  name: "Rae",
  email: "rae@example.com",
  timezone: "America/Los_Angeles",
  calendarConnected: true,
};

export default function ProfilePage() {
  const { theme, toggle } = useTheme();
  const [publicStatement, setPublicStatement] = useState(
    "I'm a creative professional interested in scheduling meetings with close friends and collaborators."
  );
  const [privateStatement, setPrivateStatement] = useState(
    "I prefer morning meetings but I'm flexible for important discussions. My team knows I'm most productive between 9am-12pm."
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsSaving(false);
  };

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--divider)] px-4 py-4 md:px-6">
        <Link href="/" className="text-lg font-semibold hover:opacity-75">
          When2Meet
        </Link>
        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
          {theme === "dark" ? (
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 2V4M10 16V18M2 10H4M16 10H18M4.93 4.93L6.34 6.34M13.66 13.66L15.07 15.07M15.07 4.93L13.66 6.34M6.34 13.66L4.93 15.07" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M17 11.35A7 7 0 118.65 3 5.5 5.5 0 0017 11.35z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </Button>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        {/* Profile Section */}
        <div className="border-b border-[var(--divider)] bg-[var(--bg-secondary)]">
          <div className="mx-auto flex max-w-4xl items-center gap-6 px-4 py-6 md:px-6">
            <div className="relative shrink-0">
              <Avatar name={MOCK_USER.name} size={64} />
              <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-[var(--bg-secondary)] bg-[var(--accent-primary)]" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                {MOCK_USER.name}
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">{MOCK_USER.email}</p>
              <div className="mt-3 flex gap-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                    Timezone
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-primary)]">
                    {MOCK_USER.timezone}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                    Calendar
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${MOCK_USER.calendarConnected ? "bg-[var(--accent-primary)]" : "bg-[var(--text-tertiary)]"}`} />
                    <p className="text-sm text-[var(--text-secondary)]">
                      {MOCK_USER.calendarConnected ? "Connected" : "Not connected"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <Link href="/" className="shrink-0 text-sm text-[var(--text-link)] hover:opacity-75 transition-opacity">
              ← Back
            </Link>
          </div>
        </div>

        {/* Statements Section */}
        <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 md:px-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Your Statements</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Public Statement */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Public Statement
              </p>
              <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                Visible to others when scheduling
              </p>
              <textarea
                value={publicStatement}
                onChange={(e) => setPublicStatement(e.target.value)}
                placeholder="Write what others can see..."
                className="mt-3 w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--input-placeholder)] focus:border-[var(--border-focused)] focus:outline-none resize-none"
                rows={8}
              />
            </div>

            {/* Private Statement */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Private Statement
              </p>
              <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                Only you and the AI see this
              </p>
              <textarea
                value={privateStatement}
                onChange={(e) => setPrivateStatement(e.target.value)}
                placeholder="Write private notes for the AI..."
                className="mt-3 w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--input-placeholder)] focus:border-[var(--border-focused)] focus:outline-none resize-none"
                rows={8}
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-8 flex justify-end">
            <Button
              variant="primary"
              size="md"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
