"use client";

import { useState, useEffect } from "react";
import { CalendarCell } from "@/components/ui/CalendarCell";

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

interface CalendarViewProps {
  userId: string;
  view: "month" | "week" | "day";
  onEventClick?: (event: CalendarEvent) => void;
}

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEK_DAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function CalendarView({ userId, view, onEventClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, [currentDate, view, userId]);

  async function fetchEvents() {
    setLoading(true);
    setError(null);

    try {
      const { timeMin, timeMax } = getDateRange();

      const res = await fetch(
        `/api/calendar/google/events?userId=${userId}&timeMin=${timeMin}&timeMax=${timeMax}&maxResults=100`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch events");
      }

      setEvents(data.events);
    } catch (err) {
      console.error("Failed to fetch calendar events:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function getDateRange() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    if (view === "month") {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      return {
        timeMin: firstDay.toISOString(),
        timeMax: lastDay.toISOString(),
      };
    } else if (view === "week") {
      const day = currentDate.getDay();
      const diff = currentDate.getDate() - day;
      const sunday = new Date(currentDate);
      sunday.setDate(diff);
      sunday.setHours(0, 0, 0, 0);
      const saturday = new Date(sunday);
      saturday.setDate(sunday.getDate() + 6);
      saturday.setHours(23, 59, 59, 999);
      return {
        timeMin: sunday.toISOString(),
        timeMax: saturday.toISOString(),
      };
    } else {
      const startOfDay = new Date(currentDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(currentDate);
      endOfDay.setHours(23, 59, 59, 999);
      return {
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
      };
    }
  }

  function getEventsForDate(date: Date): CalendarEvent[] {
    return events.filter((event) => {
      const eventStart = new Date(event.start);
      return (
        eventStart.getDate() === date.getDate() &&
        eventStart.getMonth() === date.getMonth() &&
        eventStart.getFullYear() === date.getFullYear()
      );
    });
  }

  function formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  function nextPeriod() {
    const newDate = new Date(currentDate);
    if (view === "month") {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (view === "week") {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  }

  function prevPeriod() {
    const newDate = new Date(currentDate);
    if (view === "month") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (view === "week") {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  function renderMonthView() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days = [];

    // Add empty cells for days before the month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-24" />);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayEvents = getEventsForDate(date);
      const isToday =
        date.getDate() === new Date().getDate() &&
        date.getMonth() === new Date().getMonth() &&
        date.getFullYear() === new Date().getFullYear();

      days.push(
        <div
          key={day}
          className="flex flex-col h-24 border border-[var(--divider)] p-2 hover:bg-[var(--bg-secondary)] transition-colors"
        >
          <div className="flex items-center justify-center mb-1">
            <CalendarCell
              day={day}
              active={false}
              today={isToday}
              hasEvent={dayEvents.length > 0}
              onClick={() => {}}
            />
          </div>
          <div className="flex-1 overflow-y-auto space-y-1">
            {dayEvents.slice(0, 3).map((event) => (
              <button
                key={event.id}
                onClick={() => onEventClick?.(event)}
                className="w-full text-left px-1.5 py-0.5 rounded text-xs bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 truncate hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
              >
                {formatTime(event.start)} {event.summary}
              </button>
            ))}
            {dayEvents.length > 3 && (
              <div className="text-xs text-[var(--text-tertiary)] px-1.5">
                +{dayEvents.length - 3} more
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div>
        <div className="grid grid-cols-7 mb-2">
          {WEEK_DAYS.map((day) => (
            <div
              key={day}
              className="text-center py-2 text-sm font-medium text-[var(--text-tertiary)]"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0 border-t border-l border-[var(--divider)]">
          {days}
        </div>
      </div>
    );
  }

  function renderWeekView() {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="grid grid-cols-8 border-b border-[var(--divider)]">
          <div className="p-2 text-xs font-medium text-[var(--text-tertiary)]">Time</div>
          {Array.from({ length: 7 }, (_, i) => {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            const isToday =
              date.getDate() === new Date().getDate() &&
              date.getMonth() === new Date().getMonth() &&
              date.getFullYear() === new Date().getFullYear();

            return (
              <div key={i} className="p-2 text-center border-l border-[var(--divider)]">
                <div className="text-xs font-medium text-[var(--text-tertiary)]">
                  {WEEK_DAYS[i]}
                </div>
                <div className={`text-lg font-semibold ${isToday ? 'text-blue-600' : 'text-[var(--text-primary)]'}`}>
                  {date.getDate()}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex-1 overflow-y-auto">
          {hours.map((hour) => (
            <div key={hour} className="grid grid-cols-8 border-b border-[var(--divider)]">
              <div className="p-2 text-xs text-[var(--text-tertiary)] border-r border-[var(--divider)]">
                {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
              </div>
              {Array.from({ length: 7 }, (_, i) => {
                const date = new Date(startOfWeek);
                date.setDate(startOfWeek.getDate() + i);
                const dayEvents = getEventsForDate(date).filter((event) => {
                  const eventStart = new Date(event.start);
                  return eventStart.getHours() === hour;
                });

                return (
                  <div
                    key={i}
                    className="min-h-[60px] p-1 border-l border-[var(--divider)] hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    {dayEvents.map((event) => (
                      <button
                        key={event.id}
                        onClick={() => onEventClick?.(event)}
                        className="w-full text-left px-2 py-1 mb-1 rounded text-xs bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                      >
                        <div className="font-medium truncate">{event.summary}</div>
                        <div className="text-[10px] opacity-75">
                          {formatTime(event.start)}
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderDayView() {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayEvents = getEventsForDate(currentDate);

    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="border-b border-[var(--divider)] p-4">
          <div className="text-sm text-[var(--text-tertiary)]">
            {WEEK_DAYS_FULL[currentDate.getDay()]}
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">
            {currentDate.getDate()}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {hours.map((hour) => {
            const hourEvents = dayEvents.filter((event) => {
              const eventStart = new Date(event.start);
              return eventStart.getHours() === hour;
            });

            return (
              <div
                key={hour}
                className="flex border-b border-[var(--divider)] min-h-[80px]"
              >
                <div className="w-20 p-3 text-xs text-[var(--text-tertiary)] border-r border-[var(--divider)]">
                  {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
                </div>
                <div className="flex-1 p-2 space-y-2 hover:bg-[var(--bg-secondary)] transition-colors">
                  {hourEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => onEventClick?.(event)}
                      className="w-full text-left p-3 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                    >
                      <div className="font-medium mb-1">{event.summary}</div>
                      <div className="text-sm opacity-75">
                        {formatTime(event.start)} - {formatTime(event.end)}
                      </div>
                      {event.location && (
                        <div className="text-xs opacity-75 mt-1">
                          {event.location}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[var(--text-tertiary)]">Loading calendar...</div>
      </div>
    );
  }

  if (error) {
    const isNotConnected = error.includes("No active Google Calendar connection");
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center gap-4">
        <div className="max-w-md">
          <div className="mb-3 flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/20">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600 dark:text-red-400" />
            </svg>
          </div>
          {isNotConnected ? (
            <>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                Google Calendar Not Connected
              </h3>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                Connect your Google Calendar to view your events and availability
              </p>
              <a
                href="/settings"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 4.75v14.5M19.25 12H4.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Connect in Settings
              </a>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                Unable to Load Events
              </h3>
              <p className="text-sm text-[var(--text-secondary)] mb-4">{error}</p>
              <button
                onClick={fetchEvents}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Retry
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const title = view === "month"
    ? `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    : view === "week"
    ? `Week of ${MONTHS[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`
    : `${MONTHS[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">{title}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            Today
          </button>
          <button
            onClick={prevPeriod}
            className="p-1 hover:bg-[var(--bg-secondary)] rounded transition-colors"
            aria-label="Previous"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 6L8 10L12 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={nextPeriod}
            className="p-1 hover:bg-[var(--bg-secondary)] rounded transition-colors"
            aria-label="Next"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M8 6L12 10L8 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {view === "month" && renderMonthView()}
        {view === "week" && renderWeekView()}
        {view === "day" && renderDayView()}
      </div>
    </div>
  );
}
