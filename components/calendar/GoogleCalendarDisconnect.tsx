"use client";

import { useState } from "react";

interface GoogleCalendarDisconnectProps {
  userId: string;
  onDisconnect?: () => void;
}

export function GoogleCalendarDisconnect({
  userId,
  onDisconnect,
}: GoogleCalendarDisconnectProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleDisconnect() {
    if (!confirm("Are you sure you want to disconnect your Google Calendar? You'll need to reconnect to see your events again.")) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/calendar/google/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to disconnect calendar");
      }

      setSuccess(true);

      // Clear session storage
      sessionStorage.removeItem("connectingUserId");

      // Call the callback if provided
      if (onDisconnect) {
        onDisconnect();
      }

      // Reload the page after a short delay to reflect changes
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.error("Failed to disconnect calendar:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleDisconnect}
        disabled={loading}
        className="px-4 py-2 bg-[var(--accent-danger)] text-[var(--text-inverse)] rounded-lg hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Disconnecting..." : "Disconnect Google Calendar"}
      </button>
      {error && (
        <p className="text-sm text-[var(--accent-danger)]">Error: {error}</p>
      )}
      {success && (
        <p className="text-sm text-[var(--text-link)]">
          Calendar disconnected! Refreshing page...
        </p>
      )}
    </div>
  );
}
