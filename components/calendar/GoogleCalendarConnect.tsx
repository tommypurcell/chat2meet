"use client";

import { useState } from "react";

interface GoogleCalendarConnectProps {
  userId: string;
}

export function GoogleCalendarConnect({
  userId,
}: GoogleCalendarConnectProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/calendar/google/auth-url");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to get auth URL");
      }

      sessionStorage.setItem("connectingUserId", userId);
      window.location.href = data.url;
    } catch (err) {
      console.error("Failed to connect calendar:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleConnect}
        disabled={loading}
        className="px-4 py-2 bg-[var(--accent-primary)] text-[var(--bubble-sender-text)] rounded-lg hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Connecting..." : "Connect Google Calendar"}
      </button>
      {error && <p className="text-sm text-[var(--accent-danger)]">Error: {error}</p>}
    </div>
  );
}
