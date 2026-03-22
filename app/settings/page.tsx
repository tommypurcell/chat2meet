"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { GoogleCalendarConnect } from "@/components/calendar/GoogleCalendarConnect";
import { GoogleCalendarDisconnect } from "@/components/calendar/GoogleCalendarDisconnect";
import { Button } from "@/components/ui/Button";

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
                <GoogleCalendarDisconnect userId={user.uid} />
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
