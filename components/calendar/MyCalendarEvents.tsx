"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  location: string | null;
}

export function MyCalendarEvents() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) return;

    async function fetchEvents() {
      setLoading(true);
      setError(null);
      try {
        const now = new Date();
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const res = await fetch(
          `/api/calendar/google/events?userId=${user!.uid}&timeMin=${now.toISOString()}&timeMax=${weekEnd.toISOString()}&maxResults=20`
        );
        const data = await res.json();

        if (!res.ok) {
          if (res.status === 404) {
            setError("not-connected");
          } else {
            setError(data.error || "Failed to load events");
          }
          return;
        }

        setEvents(data.events || []);
      } catch {
        setError("Failed to load events");
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, [user?.uid]);

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }

  // Group events by date
  function groupByDate(eventsList: CalendarEvent[]) {
    const groups: Record<string, CalendarEvent[]> = {};
    for (const event of eventsList) {
      const dateKey = formatDate(event.start);
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(event);
    }
    return groups;
  }

  if (loading) {
    return (
      <div className="px-3 py-4">
        <div className="animate-pulse space-y-3">
          <div className="h-3 w-20 rounded bg-[var(--bg-tertiary)]" />
          <div className="h-12 rounded-lg bg-[var(--bg-tertiary)]" />
          <div className="h-12 rounded-lg bg-[var(--bg-tertiary)]" />
        </div>
      </div>
    );
  }

  if (error === "not-connected") {
    return (
      <div className="px-3 py-4 text-center">
        <p className="text-xs text-[var(--text-tertiary)] mb-2">Google Calendar not connected</p>
        <a
          href="/settings"
          className="text-xs font-medium text-[var(--text-link)] hover:underline"
        >
          Connect in Settings
        </a>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-3 py-4 text-center">
        <p className="text-xs text-[var(--accent-danger)]">{error}</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="px-3 py-4 text-center">
        <p className="text-xs text-[var(--text-tertiary)]">No upcoming events this week</p>
      </div>
    );
  }

  const grouped = groupByDate(events);

  return (
    <div className="px-3 py-2 space-y-3">
      {Object.entries(grouped).map(([date, dateEvents]) => (
        <div key={date}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">
            {date}
          </p>
          <div className="space-y-1">
            {dateEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-2 rounded-lg bg-[var(--bg-primary)] px-2.5 py-2 border-l-[3px] border-l-[var(--accent-primary)]"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                    {event.summary}
                  </p>
                  <p className="text-[11px] text-[var(--text-tertiary)]">
                    {formatTime(event.start)} – {formatTime(event.end)}
                  </p>
                  {event.location && (
                    <p className="text-[10px] text-[var(--text-tertiary)] truncate mt-0.5">
                      {event.location}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
