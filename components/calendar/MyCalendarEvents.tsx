"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  location: string | null;
}

export type CalendarView = "month" | "week" | "day" | "list";

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function MyCalendarEvents({ view = "list" }: { view?: CalendarView }) {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDateRange = useCallback(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const day = currentDate.getDate();

    if (view === "month") {
      return {
        timeMin: new Date(year, month, 1).toISOString(),
        timeMax: new Date(year, month + 1, 0, 23, 59, 59).toISOString(),
      };
    }
    if (view === "week") {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(day - currentDate.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      return { timeMin: startOfWeek.toISOString(), timeMax: endOfWeek.toISOString() };
    }
    if (view === "day") {
      const startOfDay = new Date(year, month, day, 0, 0, 0);
      const endOfDay = new Date(year, month, day, 23, 59, 59);
      return { timeMin: startOfDay.toISOString(), timeMax: endOfDay.toISOString() };
    }
    // list: next 14 days
    const listEnd = new Date(currentDate);
    listEnd.setDate(listEnd.getDate() + 14);
    return { timeMin: currentDate.toISOString(), timeMax: listEnd.toISOString() };
  }, [view, currentDate]);

  useEffect(() => {
    if (!user?.uid) return;

    async function fetchEvents() {
      setLoading(true);
      setError(null);
      try {
        const { timeMin, timeMax } = getDateRange();
        const res = await fetch(
          `/api/calendar/google/events?userId=${user!.uid}&timeMin=${timeMin}&timeMax=${timeMax}&maxResults=100`
        );
        const data = await res.json();

        if (!res.ok) {
          setError(res.status === 404 ? "not-connected" : (data.error || "Failed to load events"));
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
  }, [user?.uid, getDateRange]);

  function navigate(direction: -1 | 1) {
    setCurrentDate(prev => {
      const d = new Date(prev);
      if (view === "month") d.setMonth(d.getMonth() + direction);
      else if (view === "week") d.setDate(d.getDate() + 7 * direction);
      else if (view === "day") d.setDate(d.getDate() + direction);
      else d.setDate(d.getDate() + 14 * direction);
      return d;
    });
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  }

  function formatDateLabel(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }

  function getEventsForDate(date: Date): CalendarEvent[] {
    return events.filter(e => {
      const eDate = new Date(e.start);
      return eDate.getDate() === date.getDate() &&
        eDate.getMonth() === date.getMonth() &&
        eDate.getFullYear() === date.getFullYear();
    });
  }

  function isToday(date: Date) {
    const now = new Date();
    return date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }

  // Navigation header
  const navTitle = view === "month"
    ? currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : view === "week"
    ? `Week of ${currentDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    : view === "day"
    ? currentDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
    : "Upcoming";

  if (loading) {
    return (
      <div className="px-3 py-4">
        <div className="animate-pulse space-y-3">
          <div className="h-3 w-24 rounded bg-[var(--bg-tertiary)]" />
          <div className="h-10 rounded-lg bg-[var(--bg-tertiary)]" />
          <div className="h-10 rounded-lg bg-[var(--bg-tertiary)]" />
          <div className="h-10 rounded-lg bg-[var(--bg-tertiary)]" />
        </div>
      </div>
    );
  }

  if (error === "not-connected") {
    return (
      <div className="px-3 py-8 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bubble-action)] text-[var(--text-link)]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2" />
            <path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <p className="text-xs text-[var(--text-tertiary)] mb-2">Google Calendar not connected</p>
        <a href="/settings" className="text-xs font-medium text-[var(--text-link)] hover:underline">
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

  return (
    <div className="flex flex-col h-full">
      {/* Nav bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--divider)]">
        <button type="button" onClick={() => navigate(-1)} className="p-1 rounded hover:bg-[var(--bg-tertiary)] transition-colors">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
            <path d="M12 6L8 10L12 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button type="button" onClick={goToToday} className="text-[12px] font-semibold text-[var(--text-primary)] hover:text-[var(--text-link)] transition-colors">
          {navTitle}
        </button>
        <button type="button" onClick={() => navigate(1)} className="p-1 rounded hover:bg-[var(--bg-tertiary)] transition-colors">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
            <path d="M8 6L12 10L8 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {view === "month" && <MonthView currentDate={currentDate} events={events} getEventsForDate={getEventsForDate} isToday={isToday} />}
        {view === "week" && <WeekView currentDate={currentDate} getEventsForDate={getEventsForDate} isToday={isToday} formatTime={formatTime} />}
        {view === "day" && <DayView events={getEventsForDate(currentDate)} formatTime={formatTime} />}
        {view === "list" && <ListView events={events} formatDateLabel={formatDateLabel} formatTime={formatTime} />}
      </div>
    </div>
  );
}

/* ── Month View ─────────────────────────────────────── */
function MonthView({ currentDate, events, getEventsForDate, isToday }: {
  currentDate: Date;
  events: CalendarEvent[];
  getEventsForDate: (d: Date) => CalendarEvent[];
  isToday: (d: Date) => boolean;
}) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = firstDay.getDay();

  return (
    <div className="p-2">
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEK_DAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-[var(--text-tertiary)] py-1">{d.charAt(0)}</div>
        ))}
      </div>
      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px">
        {Array.from({ length: startDow }, (_, i) => (
          <div key={`e-${i}`} className="h-10" />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const date = new Date(year, month, day);
          const dayEvents = getEventsForDate(date);
          const today = isToday(date);

          return (
            <div
              key={day}
              className={cn(
                "flex flex-col items-center justify-center h-10 rounded-lg text-[12px] relative",
                today && "bg-[var(--bg-calendar-today)] font-bold",
              )}
            >
              <span className={cn(today && "text-[var(--text-link)]")}>{day}</span>
              {dayEvents.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayEvents.slice(0, 3).map((_, j) => (
                    <div key={j} className="w-1 h-1 rounded-full bg-[var(--accent-primary)]" />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Events for selected month below the grid */}
      {events.length > 0 && (
        <div className="mt-3 space-y-1">
          {events.slice(0, 8).map(event => (
            <EventRow key={event.id} event={event} />
          ))}
          {events.length > 8 && (
            <p className="text-[10px] text-[var(--text-tertiary)] text-center pt-1">
              +{events.length - 8} more
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Week View ──────────────────────────────────────── */
function WeekView({ currentDate, getEventsForDate, isToday, formatTime }: {
  currentDate: Date;
  getEventsForDate: (d: Date) => CalendarEvent[];
  isToday: (d: Date) => boolean;
  formatTime: (s: string) => string;
}) {
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7 AM to 9 PM
  const rowHeight = 60; // 60px per hour

  // Check if today is in this week
  const now = new Date();
  const isNowInThisWeek = days.some(d => isToday(d));
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const gridStartMinutes = 7 * 60; // Starts at 7 AM
  const nowOffset = ((nowMinutes - gridStartMinutes) / 60) * rowHeight;

  return (
    <div className="flex h-full flex-col overflow-x-auto custom-scrollbar bg-[var(--bg-secondary)]">
      <div className="min-w-[700px] flex-1 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-30 flex bg-[var(--bg-secondary)]/80 backdrop-blur-md border-b border-[var(--divider)]">
          <div className="w-[60px] shrink-0" />
          {days.map((date) => {
            const today = isToday(date);
            return (
              <div 
                key={date.toISOString()} 
                className={cn(
                  "flex-1 py-3 px-1 text-center border-l border-[var(--divider)]/50 first:border-l-0",
                  today && "bg-[var(--accent-primary)]/5"
                )}
              >
                <div className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">
                  {WEEK_DAYS[date.getDay()]}
                </div>
                <div className={cn(
                  "mx-auto flex h-8 w-8 items-center justify-center rounded-full text-[14px] font-bold mt-1 transition-all",
                  today ? "bg-[var(--accent-primary)] text-white shadow-[0_0_15px_rgba(0,255,163,0.4)]" : "text-[var(--text-primary)]"
                )}>
                  {date.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Grid Body */}
        <div className="flex-1 relative" style={{ height: hours.length * rowHeight }}>
          {/* Hour Lines */}
          {hours.map((hour) => (
            <div 
              key={hour} 
              className="absolute left-0 right-0 border-b border-[var(--divider)]/30 flex"
              style={{ top: (hour - 7) * rowHeight, height: rowHeight }}
            >
              <div className="w-[60px] shrink-0 text-right pr-3 text-[10px] text-[var(--text-tertiary)] pt-1 font-semibold sticky left-0 z-20 bg-[var(--bg-secondary)]/90">
                {hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
              </div>
              {days.map((_, i) => (
                <div key={i} className="flex-1 border-l border-[var(--divider)]/30" />
              ))}
            </div>
          ))}

          {/* Current Time Line */}
          {isNowInThisWeek && nowOffset >= 0 && nowOffset < hours.length * rowHeight && (
            <div 
              className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
              style={{ top: nowOffset }}
            >
              <div className="w-[60px] flex justify-end">
                 <div className="h-2 w-2 rounded-full bg-[var(--accent-danger)] mr-[-4px]" />
              </div>
              <div className="flex-1 h-px bg-[var(--accent-danger)] shadow-[0_0_8px_rgba(255,107,107,0.5)]" />
            </div>
          )}

          {/* Events Layer */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="flex h-full ml-[60px]">
              {days.map((date, dayIdx) => {
                const dayEvents = getEventsForDate(date);
                return (
                  <div key={dayIdx} className="flex-1 relative">
                    {dayEvents.map(event => {
                      const start = new Date(event.start);
                      const end = new Date(event.end);
                      const startMins = start.getHours() * 60 + start.getMinutes();
                      const endMins = end.getHours() * 60 + end.getMinutes();
                      
                      const top = ((startMins - gridStartMinutes) / 60) * rowHeight;
                      const height = ((endMins - startMins) / 60) * rowHeight;

                      // Only show if in range
                      if (top < 0 && top + height <= 0) return null;

                      return (
                        <div
                          key={event.id}
                          className="absolute left-[2px] right-[2px] z-10 p-1.5 rounded-lg border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 backdrop-blur-[2px] pointer-events-auto cursor-default hover:bg-[var(--accent-primary)]/20 transition-all shadow-sm group"
                          style={{ 
                            top: Math.max(0, top), 
                            height: Math.min(hours.length * rowHeight - top, height),
                            minHeight: 24
                          }}
                        >
                          <div className="absolute inset-y-0 left-0 w-1 bg-[var(--accent-primary)] rounded-l-lg opacity-60 group-hover:opacity-100 transition-opacity" />
                          <div className="pl-1 overflow-hidden h-full">
                            <p className="text-[11px] font-bold text-[var(--accent-primary)] truncate leading-tight filter brightness-125">
                              {event.summary}
                            </p>
                            {height > 35 && (
                              <p className="text-[9px] text-[var(--text-tertiary)] font-medium mt-0.5">
                                {formatTime(event.start)}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Day View ───────────────────────────────────────── */
function DayView({ events, formatTime }: { events: CalendarEvent[]; formatTime: (s: string) => string }) {
  // Show hours 7am–9pm
  const hours = Array.from({ length: 15 }, (_, i) => i + 7);

  function getEventsForHour(hour: number) {
    return events.filter(e => {
      const h = new Date(e.start).getHours();
      return h === hour;
    });
  }

  return (
    <div className="px-2 py-1">
      {hours.map(hour => {
        const hourEvents = getEventsForHour(hour);
        const label = hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`;

        return (
          <div key={hour} className="flex border-t border-[var(--divider)] min-h-[36px]">
            <div className="w-12 shrink-0 pt-1 text-[10px] text-[var(--text-tertiary)] text-right pr-2">
              {label}
            </div>
            <div className="flex-1 py-0.5 space-y-0.5">
              {hourEvents.map(event => (
                <div
                  key={event.id}
                  className="rounded bg-[var(--bubble-action)] border border-[var(--bubble-action-border)] px-2 py-1"
                >
                  <p className="text-[11px] font-medium text-[var(--text-link)] truncate">{event.summary}</p>
                  <p className="text-[9px] text-[var(--text-tertiary)]">
                    {formatTime(event.start)} – {formatTime(event.end)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── List View ──────────────────────────────────────── */
function ListView({ events, formatDateLabel, formatTime }: {
  events: CalendarEvent[];
  formatDateLabel: (s: string) => string;
  formatTime: (s: string) => string;
}) {
  // Group by date
  const grouped: Record<string, CalendarEvent[]> = {};
  for (const event of events) {
    const key = formatDateLabel(event.start);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(event);
  }

  if (events.length === 0) {
    return (
      <div className="px-3 py-8 text-center">
        <p className="text-xs text-[var(--text-tertiary)]">No upcoming events</p>
      </div>
    );
  }

  return (
    <div className="px-3 py-2 space-y-3">
      {Object.entries(grouped).map(([date, dateEvents]) => (
        <div key={date}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">
            {date}
          </p>
          <div className="space-y-1">
            {dateEvents.map(event => (
              <EventRow key={event.id} event={event} formatTime={formatTime} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Shared event row ───────────────────────────────── */
function EventRow({ event, formatTime }: { event: CalendarEvent; formatTime?: (s: string) => string }) {
  const fmt = formatTime || ((s: string) =>
    new Date(s).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
  );

  return (
    <div
      className="flex items-start gap-2 rounded-lg bg-[var(--bg-primary)] px-2.5 py-2 border-l-[3px] border-l-[var(--accent-primary)]"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">{event.summary}</p>
        <p className="text-[11px] text-[var(--text-tertiary)]">
          {fmt(event.start)} – {fmt(event.end)}
        </p>
        {event.location && (
          <p className="text-[10px] text-[var(--text-tertiary)] truncate mt-0.5">{event.location}</p>
        )}
      </div>
    </div>
  );
}
