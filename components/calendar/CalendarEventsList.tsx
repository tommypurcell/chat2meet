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
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-100 rounded"></div>
            <div className="h-16 bg-gray-100 rounded"></div>
            <div className="h-16 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="text-red-600">
          <p className="font-semibold mb-2">Error loading calendar events</p>
          <p className="text-sm">{error}</p>
          <button
            onClick={fetchEvents}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Upcoming Events
            </h2>
            {email && (
              <p className="text-sm text-gray-500 mt-1">
                Connected: {email}
              </p>
            )}
          </div>
          <button
            onClick={fetchEvents}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="p-6">
        {events.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
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
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {event.summary}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {formatDateTime(event.start)}
                    </p>
                    {event.description && (
                      <p className="text-sm text-gray-700 mb-2">
                        {event.description}
                      </p>
                    )}
                    {event.location && (
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <span>📍</span>
                        {event.location}
                      </p>
                    )}
                    {event.attendees.length > 0 && (
                      <p className="text-xs text-gray-500 mt-2">
                        {event.attendees.length} attendee
                        {event.attendees.length !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                  <a
                    href={event.htmlLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-4 px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                  >
                    View
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <p className="text-xs text-gray-600 text-center">
          Showing next {events.length} event{events.length !== 1 ? "s" : ""} from
          your Google Calendar
        </p>
      </div>
    </div>
  );
}
