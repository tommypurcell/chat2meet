"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { UserAvatar } from "@/components/ui/UserAvatar";

const TIMEZONES = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Phoenix",
  "Europe/London",
  "Europe/Paris",
  "UTC",
];

export default function ProfilePage() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("America/Los_Angeles");
  const [ghostMode, setGhostMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?returnTo=/profile");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    setName(user.displayName || "");
    setTimezone(user.timezone || "America/Los_Angeles");
    setGhostMode(user.ghostMode ?? false);
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/users/${user.uid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || user.displayName,
          timezone,
          ghostMode,
        }),
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Could not save profile");
      }
      setMessage("Saved.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-[var(--text-tertiary)]">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Profile</h1>
            <p className="mt-1 text-[var(--text-secondary)]">
              Update how you appear and your preferences
            </p>
          </div>
          <Link
            href="/"
            className="text-sm font-medium text-[var(--accent-primary)] hover:underline"
          >
            Back to app
          </Link>
        </div>

        <div className="mb-8 flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <UserAvatar
            name={user.displayName || user.email || "?"}
            photoURL={user.photoURL}
            size={64}
          />
          <div className="min-w-0">
            <p className="font-semibold">{user.displayName || "User"}</p>
            <p className="truncate text-sm text-[var(--text-secondary)]">{user.email}</p>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">
              Email is managed by your Google account
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-6"
        >
          <div>
            <label
              htmlFor="name"
              className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
            >
              Display name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focused)]"
              autoComplete="name"
            />
          </div>

          <div>
            <label
              htmlFor="tz"
              className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
            >
              Timezone
            </label>
            <select
              id="tz"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focused)]"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={ghostMode}
              onChange={(e) => setGhostMode(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--border)]"
            />
            <span className="text-sm">
              <span className="font-medium">Ghost mode</span>
              <span className="block text-[var(--text-secondary)]">
                Hide your name from other participants when scheduling
              </span>
            </span>
          </label>

          {message && (
            <p className="text-sm text-green-400" role="status">
              {message}
            </p>
          )}
          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </div>
    </div>
  );
}
