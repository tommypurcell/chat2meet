"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarView } from "@/components/calendar/CalendarView";
import { CalendarHeatmap } from "@/components/calendar/CalendarHeatmap";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export default function CalendarPage() {
  const { user, loading: authLoading } = useAuth();
  const { theme, toggle } = useTheme();
  const router = useRouter();
  const [calendarView, setCalendarView] = useState<"month" | "week" | "day" | "heatmap">("month");

  return (
    <div className="flex h-screen flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--divider)] bg-[var(--bg-secondary)] px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/")}
            className="flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path d="M15 10H5M5 10L10 15M5 10L10 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center bg-[var(--bg-tertiary)] rounded-lg p-1">
            <button
              onClick={() => setCalendarView("month")}
              className={cn(
                "px-3 py-1.5 text-sm rounded transition-colors",
                calendarView === "month"
                  ? "bg-[var(--bg-primary)] text-[var(--text-primary)] font-medium shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              Month
            </button>
            <button
              onClick={() => setCalendarView("week")}
              className={cn(
                "px-3 py-1.5 text-sm rounded transition-colors",
                calendarView === "week"
                  ? "bg-[var(--bg-primary)] text-[var(--text-primary)] font-medium shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              Week
            </button>
            <button
              onClick={() => setCalendarView("day")}
              className={cn(
                "px-3 py-1.5 text-sm rounded transition-colors",
                calendarView === "day"
                  ? "bg-[var(--bg-primary)] text-[var(--text-primary)] font-medium shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              Day
            </button>
            <button
              onClick={() => setCalendarView("heatmap")}
              className={cn(
                "px-3 py-1.5 text-sm rounded transition-colors",
                calendarView === "heatmap"
                  ? "bg-[var(--bg-primary)] text-[var(--text-primary)] font-medium shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              Heatmap
            </button>
          </div>

          {/* Theme Toggle */}
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
            {theme === "dark" ? (
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.5" />
                <path d="M10 2V4M10 16V18M2 10H4M16 10H18M4.93 4.93L6.34 6.34M13.66 13.66L15.07 15.07M15.07 4.93L13.66 6.34M6.34 13.66L4.93 15.07" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M17 11.35A7 7 0 118.65 3 5.5 5.5 0 0017 11.35z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </Button>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="flex-1 overflow-auto p-6">
        {authLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="mb-3 h-8 w-8 mx-auto animate-spin rounded-full border-4 border-[var(--border)] border-t-blue-600" />
              <p className="text-[var(--text-tertiary)]">Loading...</p>
            </div>
          </div>
        ) : !user ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="text-center max-w-md">
              <div className="mb-4 flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-[var(--bg-tertiary)]">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-tertiary)]" />
                  <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-tertiary)]" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                Sign in to view your calendar
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mb-6">
                Connect your Google Calendar to see your events and availability
              </p>
              <a
                href="/login?returnTo=/calendar"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Sign In
              </a>
            </div>
          </div>
        ) : calendarView === "heatmap" ? (
          <CalendarHeatmap userId={user.uid} days={30} />
        ) : (
          <CalendarView
            userId={user.uid}
            view={calendarView}
            onEventClick={(event) => {
              console.log("Event clicked:", event);
              // TODO: Show event details modal
            }}
          />
        )}
      </div>
    </div>
  );
}
