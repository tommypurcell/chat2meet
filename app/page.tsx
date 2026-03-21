"use client";

import { useState } from "react";
import { CalendarCell } from "@/components/ui/CalendarCell";
import { TimeChip } from "@/components/ui/TimeChip";
import { SheetHandle } from "@/components/ui/SheetHandle";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ActionBubble } from "@/components/chat/ActionBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import {
  SAMPLE_CHAT_MESSAGES,
  SAMPLE_TIME_SLOTS,
  SAMPLE_CALENDAR_EVENTS,
  SAMPLE_INVITE,
  WEEK_DAYS,
  MARCH_DATES,
} from "@/lib/mock-data";

/* ── Status bar mock ──────────────────────────────────── */
function StatusBar() {
  return (
    <div className="flex h-11 shrink-0 items-center justify-between px-6 text-[var(--text-primary)]">
      <span className="text-[15px] font-semibold">9:41</span>
      <div className="flex items-center gap-1">
        {/* signal dots */}
        <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
          <rect x="0" y="6" width="3" height="6" rx="1" fill="currentColor" />
          <rect x="5" y="4" width="3" height="8" rx="1" fill="currentColor" />
          <rect x="10" y="1" width="3" height="11" rx="1" fill="currentColor" />
          <rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor" />
        </svg>
      </div>
    </div>
  );
}

/* ── Calendar event row ───────────────────────────────── */
function CalendarEventRow({
  title,
  time,
  color,
}: {
  title: string;
  time: string;
  color: "primary" | "warning" | "danger";
}) {
  const borderColor =
    color === "warning" ? "var(--accent-warning)" : "var(--accent-primary)";
  return (
    <div
      className="flex items-center gap-3 rounded-xl bg-[var(--bg-secondary)] px-3 py-2.5"
      style={{
        borderLeft: `3px solid ${borderColor}`,
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
          {title}
        </p>
        <p className="text-xs text-[var(--text-tertiary)]">{time}</p>
      </div>
    </div>
  );
}

/* ── Invite preview card (Screen 6) ──────────────────── */
function InvitePreview({ onClose }: { onClose: () => void }) {
  return (
    <div className="mx-4 mb-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 shadow-[var(--shadow-card)]">
      <h3 className="text-base font-semibold text-[var(--text-primary)]">
        {SAMPLE_INVITE.title}
      </h3>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        {SAMPLE_INVITE.date} &middot; {SAMPLE_INVITE.time}
      </p>
      {SAMPLE_INVITE.location && (
        <p className="mt-0.5 text-sm text-[var(--text-tertiary)]">
          {SAMPLE_INVITE.location}
        </p>
      )}
      <div className="mt-3 flex items-center gap-2">
        {SAMPLE_INVITE.attendees.map((name) => (
          <div key={name} className="flex items-center gap-1.5">
            <Avatar name={name} size={24} />
            <span className="text-xs text-[var(--text-secondary)]">{name}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="primary" size="sm" className="flex-1">
          Send Invite
        </Button>
        <Button variant="secondary" size="sm" onClick={onClose}>
          Edit
        </Button>
      </div>
    </div>
  );
}

/* ── Main page ────────────────────────────────────────── */
export default function Home() {
  const { theme, toggle } = useTheme();
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [selectedDay, setSelectedDay] = useState(21);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [showInvitePreview, setShowInvitePreview] = useState(false);

  // Show one week row (7 days) from MARCH_DATES
  const visibleDates = MARCH_DATES.filter(
    (d) => d.day >= 16 && d.day <= 22,
  );

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--bg-tertiary)] p-4 max-sm:p-0">
      {/* Device frame — hidden on small viewports */}
      <div
        className={cn(
          "relative flex flex-col overflow-hidden",
          "bg-[var(--bg-primary)]",
          /* On sm+ show the device frame */
          "sm:max-w-[375px] sm:max-h-[812px] sm:w-full sm:h-[812px] sm:rounded-[28px] sm:border sm:border-[var(--border)] sm:shadow-[var(--shadow-elevated)]",
          /* On actual mobile, go fullscreen */
          "max-sm:w-full max-sm:h-[100dvh] max-sm:rounded-none",
        )}
      >
        {/* ── Status bar ─────────────────────────────── */}
        <StatusBar />

        {/* ── Navigation bar ─────────────────────────── */}
        <div className="flex shrink-0 items-center justify-between px-4 pb-2">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            March 2026
          </h1>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M10 2V4M10 16V18M2 10H4M16 10H18M4.93 4.93L6.34 6.34M13.66 13.66L15.07 15.07M15.07 4.93L13.66 6.34M6.34 13.66L4.93 15.07" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M17 11.35A7 7 0 118.65 3 5.5 5.5 0 0017 11.35z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </Button>
            <Button variant="ghost" size="icon" aria-label="Add event">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </Button>
          </div>
        </div>

        {/* ── Calendar + Events (scrollable area behind sheet) */}
        <div
          className={cn(
            "flex-1 overflow-y-auto overscroll-contain transition-opacity duration-200",
            sheetExpanded && "opacity-30 pointer-events-none",
          )}
        >
          {/* Weekday headers */}
          <div className="grid grid-cols-7 px-4">
            {WEEK_DAYS.map((d, i) => (
              <div
                key={`${d}-${i}`}
                className="flex items-center justify-center py-1 text-xs font-medium text-[var(--text-tertiary)]"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar row */}
          <div className="grid grid-cols-7 gap-y-1 px-4 pb-3">
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

          {/* Divider */}
          <div className="mx-4 h-px bg-[var(--divider)]" />

          {/* Events */}
          <div className="flex flex-col gap-2 px-4 py-3">
            <h2 className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
              Today
            </h2>
            {SAMPLE_CALENDAR_EVENTS.map((evt) => (
              <CalendarEventRow
                key={evt.id}
                title={evt.title}
                time={evt.time}
                color={evt.color}
              />
            ))}
          </div>
        </div>

        {/* ── Bottom sheet (chat) ────────────────────── */}
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 flex flex-col rounded-t-[20px] bg-[var(--bg-sheet)] transition-all duration-300 ease-out",
            sheetExpanded
              ? "top-0 rounded-t-none"
              : "h-[40%]",
          )}
          style={{
            boxShadow: "var(--shadow-sheet)",
          }}
        >
          {/* Sheet handle — tap to toggle */}
          <button
            type="button"
            className="cursor-pointer bg-transparent border-none w-full"
            onClick={() => {
              setSheetExpanded((prev) => !prev);
              if (sheetExpanded) {
                setShowInvitePreview(false);
              }
            }}
            aria-label={sheetExpanded ? "Collapse chat" : "Expand chat"}
          >
            <SheetHandle />
          </button>

          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-0 py-1">
            {!sheetExpanded ? (
              /* Compact mode — show last 2 messages */
              <>
                {SAMPLE_CHAT_MESSAGES.map((msg) => (
                  <ChatMessage key={msg.id} role={msg.role}>
                    {msg.content}
                  </ChatMessage>
                ))}
              </>
            ) : (
              /* Expanded mode (Screen 4) — full conversation */
              <>
                {SAMPLE_CHAT_MESSAGES.map((msg) => (
                  <ChatMessage key={msg.id} role={msg.role}>
                    {msg.content}
                  </ChatMessage>
                ))}

                {/* Time slot chips (Screen 5) */}
                <div className="flex flex-wrap gap-2 px-4 py-2">
                  {SAMPLE_TIME_SLOTS.map((slot) => (
                    <TimeChip
                      key={slot.id}
                      time={slot.time}
                      date={slot.date}
                      selected={selectedSlot === slot.id}
                      onClick={() => setSelectedSlot(slot.id)}
                    />
                  ))}
                </div>

                {/* After selecting a slot, show action bubble */}
                {selectedSlot && !showInvitePreview && (
                  <ActionBubble
                    text="Create calendar invite"
                    onClick={() => setShowInvitePreview(true)}
                  />
                )}

                {/* Invite preview (Screen 6) */}
                {showInvitePreview && (
                  <InvitePreview onClose={() => setShowInvitePreview(false)} />
                )}
              </>
            )}
          </div>

          {/* Chat input */}
          <ChatInput
            onSend={() => {}}
            placeholder="Schedule a meeting..."
          />
        </div>
      </div>
    </div>
  );
}
