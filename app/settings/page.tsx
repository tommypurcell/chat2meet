"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { GoogleCalendarConnect } from "@/components/calendar/GoogleCalendarConnect";
import { GoogleCalendarDisconnect } from "@/components/calendar/GoogleCalendarDisconnect";
import { Button } from "@/components/ui/Button";

interface CalendarOption {
  id: string;
  summary: string;
  primary: boolean;
  backgroundColor: string | null;
}

function CalendarSelector({ userId }: { userId: string }) {
  const [calendars, setCalendars] = useState<CalendarOption[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function fetchCalendars() {
      try {
        const res = await fetch(`/api/calendar/google/calendars?userId=${userId}`);
        const data = await res.json();
        if (data.success) {
          setCalendars(data.calendars || []);
          setSelectedCalendarId(data.selectedCalendarId || null);
        }
      } catch (err) {
        console.error("Failed to fetch calendars:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCalendars();
  }, [userId]);

  async function handleSelect(calendarId: string) {
    setSelectedCalendarId(calendarId);
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch("/api/calendar/google/calendars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, calendarId }),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) {
      console.error("Failed to save calendar selection:", err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-2 mt-3">
        <div className="h-10 rounded-lg bg-[var(--bg-tertiary)]" />
        <div className="h-10 rounded-lg bg-[var(--bg-tertiary)]" />
      </div>
    );
  }

  if (calendars.length === 0) return null;

  return (
    <div className="mt-4">
      <p className="text-sm font-medium text-[var(--text-primary)] mb-2">
        Selected Calendar
      </p>
      <p className="text-xs text-[var(--text-tertiary)] mb-3">
        Choose which calendar to use for availability and events
      </p>
      <div className="space-y-1.5">
        {calendars.map((cal) => {
          const isSelected = selectedCalendarId
            ? cal.id === selectedCalendarId
            : cal.primary;

          return (
            <button
              key={cal.id}
              type="button"
              onClick={() => handleSelect(cal.id)}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all border ${
                isSelected
                  ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10"
                  : "border-transparent hover:bg-[var(--bg-tertiary)]"
              }`}
            >
              <div
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: cal.backgroundColor || "var(--accent-primary)" }}
              />
              <span className={`text-sm truncate flex-1 ${
                isSelected ? "font-medium text-[var(--accent-primary)]" : "text-[var(--text-primary)]"
              }`}>
                {cal.summary}
              </span>
              {cal.primary && (
                <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold tracking-wider">
                  Primary
                </span>
              )}
              {isSelected && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-[var(--accent-primary)]">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
      {(saving || saved) && (
        <p className={`text-xs mt-2 transition-opacity ${saved ? "text-green-500" : "text-[var(--text-tertiary)]"}`}>
          {saving ? "Saving..." : "✓ Saved"}
        </p>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?returnTo=/settings");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-[var(--text-tertiary)]">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="mt-1 text-[var(--text-secondary)]">
              Manage your account and calendar integrations
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
            Back to app
          </Button>
        </div>

        {/* Account Section */}
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold">Account</h2>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
            <div className="flex items-center gap-3">
              {user.photoURL && (
                <img
                  src={user.photoURL}
                  alt="Profile"
                  className="h-12 w-12 rounded-full"
                />
              )}
              <div>
                <p className="font-medium">{user.displayName || "User"}</p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {user.email}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Integration Section */}
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold">Calendar Integration</h2>
          <div className="space-y-4">
            {user.calendarConnected ? (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    Google Calendar connected
                  </p>
                </div>
                <CalendarSelector userId={user.uid} />
                <div className="mt-4 pt-4 border-t border-[var(--divider)]">
                  <GoogleCalendarDisconnect userId={user.uid} />
                </div>
              </div>
            ) : (
              <GoogleCalendarConnect userId={user.uid} />
            )}
          </div>
        </div>

        {/* Preferences Section */}
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold">Preferences</h2>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Ghost Mode</p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Hide your name from other participants
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="h-5 w-5 rounded border-[var(--border)]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
