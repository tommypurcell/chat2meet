"use client";

import { useState, useEffect } from "react";

interface CalendarEvent {
  id: string;
  summary: string;
  description: string | null;
  start: string;
  end: string;
  location: string | null;
  attendees: string[];
  htmlLink: string;
}

interface CalendarEventsListProps {
  userId: string;
}

export function CalendarEventsList({ userId }: CalendarEventsListProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    fetchEvents();
  }, [userId]);

  async function fetchEvents() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/calendar/google/events?userId=${userId}&maxResults=10`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch events");
      }

      setEvents(data.events);
      setEmail(data.email);
    } catch (err) {
      console.error("Failed to fetch calendar events:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function formatDateTime(dateTimeStr: string) {
    const date = new Date(dateTimeStr);
    return date.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  if (loading) {
    return (
      <div className="p-6 bg-[var(--bg-primary)] rounded-lg" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="animate-pulse">
          <div className="h-4 bg-[var(--bg-tertiary)] rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-[var(--bg-secondary)] rounded"></div>
            <div className="h-16 bg-[var(--bg-secondary)] rounded"></div>
            <div className="h-16 bg-[var(--bg-secondary)] rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-[var(--bg-primary)] rounded-lg" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="text-[var(--accent-danger)]">
          <p className="font-semibold mb-2">Error loading calendar events</p>
          <p className="text-sm">{error}</p>
          <button
            onClick={fetchEvents}
            className="mt-4 px-4 py-2 bg-[var(--accent-primary)] text-[var(--bubble-sender-text)] rounded hover:opacity-90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-primary)] rounded-lg" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="p-6 border-b border-[var(--divider)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              Upcoming Events
            </h2>
            {email && (
              <p className="text-sm text-[var(--text-tertiary)] mt-1">
                Connected: {email}
              </p>
            )}
          </div>
          <button
            onClick={fetchEvents}
            className="px-3 py-1 text-sm bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded hover:bg-[var(--bg-tertiary)]"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="p-6">
        {events.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-tertiary)]">
            <p className="text-lg mb-2">No upcoming events</p>
            <p className="text-sm">
              Your calendar is clear for the next few days
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <div
                key={event.id}
                className="p-4 border border-[var(--border)] rounded-lg hover:border-[var(--border-focused)] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-[var(--text-primary)] mb-1">
                      {event.summary}
                    </h3>
                    <p className="text-sm text-[var(--text-tertiary)] mb-2">
                      {formatDateTime(event.start)}
                    </p>
                    {event.description && (
                      <p className="text-sm text-[var(--text-secondary)] mb-2">
                        {event.description}
                      </p>
                    )}
                    {event.location && (
                      <p className="text-sm text-[var(--text-tertiary)] flex items-center gap-1">
                        <span>📍</span>
                        {event.location}
                      </p>
                    )}
                    {event.attendees.length > 0 && (
                      <p className="text-xs text-[var(--text-tertiary)] mt-2">
                        {event.attendees.length} attendee
                        {event.attendees.length !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                  <a
                    href={event.htmlLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-4 px-3 py-1 text-xs bg-[var(--bubble-action)] text-[var(--text-link)] rounded hover:opacity-80"
                  >
                    View
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 bg-[var(--bg-secondary)] border-t border-[var(--divider)] rounded-b-lg">
        <p className="text-xs text-[var(--text-tertiary)] text-center">
          Showing next {events.length} event{events.length !== 1 ? "s" : ""} from
          your Google Calendar
        </p>
      </div>
    </div>
  );
}
