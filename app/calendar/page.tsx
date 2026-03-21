"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { CalendarCell } from "@/components/ui/CalendarCell";
import { useTheme } from "@/lib/theme";
import { WEEK_DAYS, MARCH_DATES, CHAT_SUGGESTIONS } from "@/lib/mock-data";
import { useState } from "react";

export default function CalendarPage() {
  const { theme, toggle } = useTheme();
  const [selectedDay, setSelectedDay] = useState(21);

  const visibleDates = MARCH_DATES.filter((d) => d.day >= 16 && d.day <= 22);

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--divider)] px-6 py-4">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" aria-label="Back">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">Calendar</h1>
        </div>
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-lg px-6 py-8">
          <div className="grid grid-cols-7 mb-2">
            {WEEK_DAYS.map((d, i) => (
              <div key={`${d}-${i}`} className="flex items-center justify-center py-2 text-sm font-medium text-[var(--text-tertiary)]">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-2 mb-8">
            {visibleDates.map((d) => (
              <div key={d.day} className="flex items-center justify-center">
                <CalendarCell
                  day={d.day}
                  active={d.day === selectedDay}
                  today={d.day === 20}
                  hasEvent={d.day === 19 || d.day === 21 || d.day === 23 ? true : d.events}
                  onClick={() => setSelectedDay(d.day)}
                />
              </div>
            ))}
          </div>

          {/* Quick schedule suggestions */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Quick schedule
            </p>
            <div className="grid grid-cols-2 gap-2">
              {CHAT_SUGGESTIONS.map((s) => (
                <Link key={s.title} href="/">
                  <button
                    type="button"
                    className="w-full flex items-start gap-3 rounded-xl bg-[var(--bg-secondary)] px-3 py-2.5 text-left transition-colors hover:bg-[var(--bg-tertiary)]"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{s.title}</p>
                      <p className="text-xs text-[var(--text-tertiary)] truncate">{s.body}</p>
                    </div>
                  </button>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
