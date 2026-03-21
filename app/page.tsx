"use client";

import { useState, useEffect, useRef } from "react";
import { CalendarCell } from "@/components/ui/CalendarCell";
import { TimeChip } from "@/components/ui/TimeChip";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ActionBubble } from "@/components/chat/ActionBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { AvailabilityGrid } from "@/components/calendar/AvailabilityGrid";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import {
  CHAT_SUGGESTIONS,
  MEETING_GROUPS,
  SAMPLE_CHAT_MESSAGES,
  SAMPLE_TIME_SLOTS,
  SAMPLE_INVITE,
  WEEK_DAYS,
  MARCH_DATES,
} from "@/lib/mock-data";

/* ── Fade-in wrapper ─────────────────────────────────── */
function FadeIn({ children, className }: { children: React.ReactNode; className?: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div
      className={cn(
        "transition-all duration-300 ease-out",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
        className,
      )}
    >
      {children}
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

/* ── Chat content (messages + time slots + invite) ───── */
function ChatContent({
  selectedSlot,
  showInvitePreview,
  onSelectSlot,
  onShowInvite,
  onCloseInvite,
}: {
  selectedSlot: string | null;
  showInvitePreview: boolean;
  onSelectSlot: (id: string) => void;
  onShowInvite: () => void;
  onCloseInvite: () => void;
}) {
  return (
    <div>
      {SAMPLE_CHAT_MESSAGES.map((msg) => (
        <ChatMessage key={msg.id} role={msg.role}>
          {msg.content}
        </ChatMessage>
      ))}

      <div className="flex flex-wrap gap-2 px-4 py-2">
        {SAMPLE_TIME_SLOTS.map((slot) => (
          <TimeChip
            key={slot.id}
            time={slot.time}
            date={slot.date}
            selected={selectedSlot === slot.id}
            onClick={() => onSelectSlot(slot.id)}
          />
        ))}
      </div>

      {selectedSlot && !showInvitePreview && (
        <ActionBubble
          text="Create calendar invite"
          onClick={onShowInvite}
        />
      )}

      {showInvitePreview && (
        <InvitePreview onClose={onCloseInvite} />
      )}
    </div>
  );
}

/* ── Main page ────────────────────────────────────────── */
export default function Home() {
  const { theme, toggle } = useTheme();
  const [selectedDay, setSelectedDay] = useState(21);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [showInvitePreview, setShowInvitePreview] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [chatStarted, setChatStarted] = useState(false);
  const [chatLabel, setChatLabel] = useState<string>("Chat");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const visibleDates = MARCH_DATES.filter(
    (d) => d.day >= 16 && d.day <= 22,
  );

  const activeGroupData = MEETING_GROUPS.find((g) => g.id === activeGroup);

  function startChat(groupId?: string, label?: string) {
    if (groupId) setActiveGroup(groupId);
    setChatLabel(label || "Chat");
    setChatStarted(true);
    setSelectedSlot(null);
    setShowInvitePreview(false);
  }

  function exitChat() {
    setChatStarted(false);
    setActiveGroup(null);
    setChatLabel("Chat");
    setSelectedSlot(null);
    setShowInvitePreview(false);
  }

  // Auto-scroll chat to bottom when chat starts
  useEffect(() => {
    if (chatStarted && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatStarted]);

  return (
    <div className="flex h-[100dvh] w-full bg-[var(--bg-primary)] text-[var(--text-primary)]">

      {/* ═══════════════════════════════════════════════════ */}
      {/* DESKTOP (lg+): 3-column layout                     */}
      {/* ═══════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:flex-1">

        {/* ── Left column: Meeting groups ──────────────── */}
        <div className="flex w-[260px] shrink-0 flex-col border-r border-[var(--divider)] bg-[var(--bg-secondary)]">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--divider)] px-4 py-4">
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">When2Meet</h2>
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

          {/* New group button */}
          <div className="px-3 pt-3">
            <Button variant="secondary" size="md" className="w-full justify-start gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              New meeting
            </Button>
          </div>

          {/* Group list */}
          <div className="mt-3 flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-4">
            <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.8px] text-[var(--text-tertiary)]">
              Groups
            </p>
            {MEETING_GROUPS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => startChat(g.id, g.name)}
                className={cn(
                  "flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors cursor-pointer",
                  activeGroup === g.id
                    ? "bg-[var(--bubble-action)] border border-[var(--bubble-action-border)] text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]",
                )}
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--bg-tertiary)] text-xs font-semibold text-[var(--text-secondary)]">
                  {g.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{g.name}</p>
                  <p className="truncate text-xs text-[var(--text-tertiary)]">
                    {g.members.join(", ")}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* User */}
          <div className="border-t border-[var(--divider)] p-3">
            <div className="flex items-center gap-2 rounded-lg px-2 py-2">
              <Avatar name="Rae" size={32} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--text-primary)]">Rae</p>
                <p className="truncate text-[11px] text-[var(--text-tertiary)]">Free plan</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Center column: Calendar / Availability Grid ─ */}
        <div className="flex flex-1 flex-col border-r border-[var(--divider)]">
          {/* Nav */}
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--divider)] px-6 py-4">
            <h1 className="text-2xl font-bold tracking-tight">
              {chatStarted ? "Select Availability" : "March 2026"}
            </h1>
            {chatStarted ? (
              <Button variant="ghost" size="sm" onClick={exitChat}>
                Back to calendar
              </Button>
            ) : (
              <Button variant="ghost" size="icon" aria-label="Add event">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </Button>
            )}
          </div>

          {chatStarted ? (
            /* Availability grid (when2meet-style) */
            <FadeIn className="flex-1 overflow-hidden p-4">
              <AvailabilityGrid />
            </FadeIn>
          ) : (
            /* Calendar */
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mx-auto max-w-lg">
                <div className="grid grid-cols-7 mb-2">
                  {WEEK_DAYS.map((d, i) => (
                    <div key={`${d}-${i}`} className="flex items-center justify-center py-2 text-sm font-medium text-[var(--text-tertiary)]">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-y-2">
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

                {/* Suggestion chips below calendar */}
                <div className="mt-8">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                    Quick schedule
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {CHAT_SUGGESTIONS.map((s) => (
                      <button
                        key={s.title}
                        type="button"
                        onClick={() => startChat(undefined, s.title)}
                        className="flex items-start gap-3 rounded-xl bg-[var(--bg-secondary)] px-3 py-2.5 text-left transition-colors hover:bg-[var(--bg-tertiary)] cursor-pointer"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">{s.title}</p>
                          <p className="text-xs text-[var(--text-tertiary)] truncate">{s.body}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right column: Chat ──────────────────────── */}
        <div className="flex w-[380px] shrink-0 flex-col bg-[var(--bg-sheet)] xl:w-[420px]">
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--divider)] px-5 py-4">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold truncate">{chatLabel}</h2>
              {activeGroupData && (
                <p className="text-xs text-[var(--text-tertiary)] truncate">
                  {activeGroupData.members.join(", ")}
                </p>
              )}
            </div>
            {activeGroupData ? (
              <div className="flex -space-x-1.5">
                {activeGroupData.members.slice(0, 3).map((m) => (
                  <Avatar key={m} name={m} size={24} />
                ))}
              </div>
            ) : (
              <Avatar name="W" size={28} />
            )}
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain py-2">
            {!chatStarted ? (
              <FadeIn className="flex flex-col items-center justify-center h-full px-6 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg-tertiary)]">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="var(--text-tertiary)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-[var(--text-secondary)]">
                  Select a group or type a message to start scheduling
                </p>
              </FadeIn>
            ) : (
              <FadeIn>
                <ChatContent
                  selectedSlot={selectedSlot}
                  showInvitePreview={showInvitePreview}
                  onSelectSlot={setSelectedSlot}
                  onShowInvite={() => setShowInvitePreview(true)}
                  onCloseInvite={() => setShowInvitePreview(false)}
                />
                <div ref={chatEndRef} />
              </FadeIn>
            )}
          </div>

          <ChatInput
            onSend={() => startChat()}
            placeholder="Schedule a meeting..."
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* TABLET (md to lg): 2-column (groups + chat)        */}
      {/* ═══════════════════════════════════════════════════ */}
      <div className="hidden md:flex md:flex-1 lg:hidden">
        {/* Left: groups */}
        <div className="flex w-[260px] shrink-0 flex-col border-r border-[var(--divider)] bg-[var(--bg-secondary)]">
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--divider)] px-4 py-4">
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">When2Meet</h2>
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
          <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pt-3 pb-4">
            {MEETING_GROUPS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => startChat(g.id, g.name)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors cursor-pointer",
                  activeGroup === g.id
                    ? "bg-[var(--bubble-action)] border border-[var(--bubble-action-border)] text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]",
                )}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--bg-tertiary)] text-xs font-semibold text-[var(--text-secondary)]">
                  {g.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{g.name}</p>
                  <p className="truncate text-xs text-[var(--text-tertiary)]">{g.members.slice(0, 2).join(", ")}</p>
                </div>
              </button>
            ))}
          </div>
          <div className="border-t border-[var(--divider)] p-3">
            <div className="flex items-center gap-2 px-2 py-1">
              <Avatar name="Rae" size={28} />
              <span className="text-sm font-medium text-[var(--text-primary)]">Rae</span>
            </div>
          </div>
        </div>

        {/* Right: chat */}
        <div className="flex flex-1 flex-col bg-[var(--bg-primary)]">
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--divider)] px-5 py-4">
            <h2 className="text-lg font-semibold">Chat</h2>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain py-2">
            {!chatStarted ? (
              <div className="flex flex-col gap-2 px-4 py-4">
                <p className="text-xs font-medium text-[var(--text-tertiary)]">Quick schedule</p>
                {CHAT_SUGGESTIONS.map((s) => (
                  <button
                    key={s.title}
                    type="button"
                    onClick={() => setChatStarted(true)}
                    className="flex items-start gap-3 rounded-xl bg-[var(--bg-secondary)] px-3 py-2.5 text-left transition-colors hover:bg-[var(--bg-tertiary)] cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)]">{s.title}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">{s.body}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <ChatContent
                selectedSlot={selectedSlot}
                showInvitePreview={showInvitePreview}
                onSelectSlot={setSelectedSlot}
                onShowInvite={() => setShowInvitePreview(true)}
                onCloseInvite={() => setShowInvitePreview(false)}
              />
            )}
          </div>
          <ChatInput onSend={() => setChatStarted(true)} placeholder="Schedule a meeting..." />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* MOBILE (<md): Full-screen chat with bottom sheet   */}
      {/* No calendar — just suggestions + chat              */}
      {/* ═══════════════════════════════════════════════════ */}
      <div className="relative flex flex-1 flex-col md:hidden">
        {/* Nav */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--divider)] px-4 py-3">
          <div className="flex items-center gap-2">
            {chatStarted && (
              <button
                type="button"
                onClick={exitChat}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] cursor-pointer"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            <h1 className="text-lg font-bold text-[var(--text-primary)]">
              {chatStarted ? chatLabel : "Chat2Meet"}
            </h1>
          </div>
          <div className="flex items-center gap-1">
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain py-2">
          {!chatStarted ? (
            <>
              {/* Meeting groups as cards */}
              <div className="px-4 py-2">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Quick schedule
                </p>
                <div className="flex flex-col gap-2">
                  {CHAT_SUGGESTIONS.map((s) => (
                    <button
                      key={s.title}
                      type="button"
                      onClick={() => setChatStarted(true)}
                      className="flex items-start gap-3 rounded-xl bg-[var(--bg-secondary)] px-3 py-3 text-left transition-colors hover:bg-[var(--bg-tertiary)] cursor-pointer"
                    >
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--bubble-action)] text-[var(--text-link)]">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[15px] font-medium text-[var(--text-primary)]">{s.title}</p>
                        <p className="text-xs text-[var(--text-tertiary)]">{s.body}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Meeting groups list */}
              <div className="px-4 pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Groups
                </p>
                <div className="flex flex-col gap-1">
                  {MEETING_GROUPS.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        setActiveGroup(g.id);
                        setChatStarted(true);
                      }}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[var(--bg-secondary)] cursor-pointer"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--bg-secondary)] text-sm font-semibold text-[var(--text-secondary)]">
                        {g.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[var(--text-primary)]">{g.name}</p>
                        <p className="text-xs text-[var(--text-tertiary)]">{g.members.join(", ")}</p>
                      </div>
                      <span className="text-[11px] text-[var(--text-tertiary)]">{g.lastActive}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <ChatContent
              selectedSlot={selectedSlot}
              showInvitePreview={showInvitePreview}
              onSelectSlot={setSelectedSlot}
              onShowInvite={() => setShowInvitePreview(true)}
              onCloseInvite={() => setShowInvitePreview(false)}
            />
          )}
        </div>

        {/* Chat input — always visible */}
        <ChatInput onSend={() => setChatStarted(true)} placeholder="Schedule a meeting..." />
      </div>
    </div>
  );
}
