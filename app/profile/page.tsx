"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

type UserProfile = {
  id: string;
  name: string;
  email: string;
  timezone: string;
  calendarConnected: boolean;
  preferences: {
    public?: string;
    private?: string;
    noMeetingsBefore?: string;
    noMeetingsAfter?: string;
    maxMeetingLength?: number;
    preferredDays?: string[];
  };
};

export default function ProfilePage() {
  const { theme, toggle } = useTheme();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [publicStatement, setPublicStatement] = useState("");
  const [privateStatement, setPrivateStatement] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }

    async function fetchProfile() {
      try {
        const res = await fetch("/api/user");
        if (res.ok) {
          const data: UserProfile = await res.json();
          setProfile(data);
          setPublicStatement(data.preferences?.public || "");
          setPrivateStatement(data.preferences?.private || "");
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [user, authLoading, router]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferences: {
            ...profile?.preferences,
            public: publicStatement,
            private: privateStatement,
          },
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[var(--bg-primary)]">
        <p className="text-sm text-[var(--text-tertiary)]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--divider)] px-4 py-4 md:px-6">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" aria-label="Back">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">Profile</h1>
        </div>
        <div className="flex items-center gap-1">
        <Link href="/settings">
          <Button variant="ghost" size="icon" aria-label="Settings" title="Settings">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Button>
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
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        {/* Profile Section */}
        <div className="border-b border-[var(--divider)] bg-[var(--bg-secondary)]">
          <div className="mx-auto flex max-w-4xl items-center gap-6 px-4 py-6 md:px-6">
            <div className="relative shrink-0">
              <Avatar name={profile?.name || user?.displayName || "User"} size={64} />
              <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-[var(--bg-secondary)] bg-[var(--accent-primary)]" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                {profile?.name || user?.displayName || "User"}
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">{profile?.email || user?.email || ""}</p>
              <div className="mt-3 flex gap-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                    Timezone
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-primary)]">
                    {profile?.timezone || "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                    Calendar
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${profile?.calendarConnected ? "bg-[var(--accent-primary)]" : "bg-[var(--text-tertiary)]"}`} />
                    <p className="text-sm text-[var(--text-secondary)]">
                      {profile?.calendarConnected ? "Connected" : "Not connected"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statements Section */}
        <div className="mx-auto w-full max-w-4xl px-4 py-8 md:px-6">
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
                placeholder="Write what others can see about your scheduling preferences..."
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
                placeholder="Write private notes for the AI scheduling agent..."
                className="mt-3 w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--input-placeholder)] focus:border-[var(--border-focused)] focus:outline-none resize-none"
                rows={8}
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-8 flex items-center justify-end gap-3">
            {saved && (
              <span className="text-sm text-[var(--accent-primary)]">Saved!</span>
            )}
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
