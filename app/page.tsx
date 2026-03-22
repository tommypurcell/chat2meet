"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatContent } from "@/components/chat/ChatContent";
import { MyCalendarEvents, type CalendarView } from "@/components/calendar/MyCalendarEvents";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { CHAT_SUGGESTIONS } from "@/lib/mock-data";

interface MeetingEvent {
  id: string;
  title: string;
  participantIds: string[];
  status: string;
  createdAt: string;
}

const ROUTES = [
  { href: "/onboarding", label: "1. Sign Up" },
  { href: "/onboarding/preferences", label: "2. Preferences" },
  { href: "/", label: "3. Home" },
  { href: "/network", label: "4. Network" },
  { href: "/invite/demo", label: "7. Invite" },
  { href: "/join/demo", label: "8. Join Gate" },
  { href: "/event/demo", label: "9. Event Detail" },
];



/* ── Main page ────────────────────────────────────────── */
export default function Home() {
  const { theme, toggle } = useTheme();
  const { user, loading: authLoading, refresh } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { messages, sendMessage, status } = useChat();
  const isLoading = status === "submitted" || status === "streaming";
  const chatStarted = messages.length > 0;

  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [showInvitePreview, setShowInvitePreview] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [meetingEvents, setMeetingEvents] = useState<MeetingEvent[]>([]);
  const [screensMenuOpen, setScreensMenuOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarView, setCalendarView] = useState<CalendarView>("week");
  const [calendarWidth, setCalendarWidth] = useState(350);
  const isResizing = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = window.innerWidth - e.clientX;
      setCalendarWidth(Math.max(280, Math.min(700, newWidth)));
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, []);

  useEffect(() => {
    if (!user) return;
    fetch("/api/events?limit=20")
      .then((res) => res.ok ? res.json() : { events: [] })
      .then((data) => setMeetingEvents(data.events || []))
      .catch(() => {});
  }, [user]);

  function handleSendMessage(text: string) {
    sendMessage({ parts: [{ type: "text", text }] });
  }

  async function handleSignOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    await refresh();
    router.push("/login");
  }

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-[var(--text-tertiary)] text-sm">Loading...</div>
      </div>
    );
  }

  // Redirect to sign-in page when not authenticated
  if (!user) {
    router.push("/login");
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-[var(--text-tertiary)] text-sm">Redirecting...</div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full bg-[var(--bg-primary)] text-[var(--text-primary)]">

      {/* ═══════════════════════════════════════════════════ */}
      {/* DESKTOP (lg+): 2-column layout (sidebar + chat)    */}
      {/* ═══════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:flex-1">

        {/* ── Left column: Meeting groups ──────────────── */}
        <div className="flex w-[260px] shrink-0 flex-col border-r border-[var(--divider)] bg-[var(--bg-secondary)]">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--divider)] px-4 py-4 relative">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Button variant="ghost" size="icon" onClick={() => setScreensMenuOpen(!screensMenuOpen)} aria-label="Screens menu">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                    <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                    <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                    <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </Button>
                {screensMenuOpen && (
                  <>
                    <button
                      type="button"
                      className="fixed inset-0 z-40"
                      onClick={() => setScreensMenuOpen(false)}
                    />
                    <div className="absolute top-full left-0 mt-1 z-50 flex flex-col gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-sheet)] p-2 shadow-[var(--shadow-elevated)] w-48">
                      <div className="flex items-center justify-between px-2 py-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                          Screens
                        </p>
                        <button
                          type="button"
                          onClick={() => setScreensMenuOpen(false)}
                          className="rounded p-1 hover:bg-[var(--bg-tertiary)] transition-colors"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={toggle}
                        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                      >
                        {theme === "dark" ? "☀ Light" : "● Dark"}
                      </button>
                      <div className="mx-1 h-px bg-[var(--divider)]" />
                      {ROUTES.map((r) => (
                        <Link
                          key={r.href}
                          href={r.href}
                          onClick={() => setScreensMenuOpen(false)}
                          className={cn(
                            "rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
                            pathname === r.href
                              ? "bg-[var(--accent-primary)] text-white"
                              : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]",
                          )}
                        >
                          {r.label}
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Chat2meet</h2>
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
            <span className="truncate text-[15px] font-semibold tracking-[-0.24px] text-[var(--text-primary)]">
            Chat2meet
          </span>
            {meetingEvents.length === 0 ? (
              <p className="px-3 py-2 text-xs text-[var(--text-tertiary)]">No meetings yet</p>
            ) : (
              meetingEvents.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => setActiveGroup(ev.id)}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors cursor-pointer",
                    activeGroup === ev.id
                      ? "bg-[var(--bubble-action)] border border-[var(--bubble-action-border)] text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]",
                  )}
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--bg-tertiary)] text-xs font-semibold text-[var(--text-secondary)]">
                    {ev.title.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{ev.title}</p>
                    <p className="truncate text-xs text-[var(--text-tertiary)]">
                      {ev.participantIds?.join(", ") || ev.status}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* User */}
          <div className="border-t border-[var(--divider)] p-3">
            <div className="flex items-center justify-between px-2 py-2">
              <Link href="/profile" className="flex items-center gap-2 min-w-0 flex-1 hover:opacity-80 transition-opacity">
                <Avatar name={user?.displayName || user?.email || "User"} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--text-primary)]">{user?.displayName || user?.email?.split("@")[0] || "User"}</p>
                  <p className="truncate text-[11px] text-[var(--text-tertiary)]">Free plan</p>
                </div>
              </Link>
              <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Button>
            </div>
          </div>
        </div>

        {/* ── Right column: Full-width Chat ──────────────── */}
        <div className="flex flex-1 flex-col bg-[var(--bg-sheet)]">
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--divider)] px-5 py-4">
            <h2 className="text-lg font-semibold">Chat</h2>
            <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="lg" 
                  title="Calendar" 
                  className={cn("p-2", showCalendar && "bg-[var(--bg-tertiary)] text-[var(--accent-primary)]")}
                  onClick={() => setShowCalendar(!showCalendar)}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="4" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.75" />
                    <path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                  </svg>
                </Button>
              <Link href="/availability">
                <Button variant="ghost" size="lg" title="Availability" className="p-2">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="3" width="20" height="18" rx="2" stroke="currentColor" strokeWidth="1.75" />
                    <path d="M2 9h20M6 2v7M12 2v7M18 2v7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                  </svg>
                </Button>
              </Link>
              <Link href="/network">
                <Button variant="ghost" size="lg" title="Network" className="p-2">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="7" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="17" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="12" cy="16" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M9 10c.5.5 1.5 1 3 1s2.5-.5 3-1M7 10v2c0 1.5.5 2.5 2 3M17 10v2c0 1.5-.5 2.5-2 3M12 18.5v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Button>
              </Link>
              <Link href="/profile">
                <Button variant="ghost" className="p-1.5" title="Profile">
                  <Avatar name="Rae" size={24} />
                </Button>
              </Link>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain py-2">
            {!chatStarted ? (
              <div className="flex flex-col items-center justify-center h-full px-6 py-8">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg-tertiary)]">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="var(--text-tertiary)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-[var(--text-secondary)] mb-6">
                  Start a conversation to find meeting times
                </p>
                <div className="w-full max-w-2xl grid grid-cols-2 gap-3">
                  {CHAT_SUGGESTIONS.map((s) => (
                    <button
                      key={s.title}
                      type="button"
                      onClick={() => handleSendMessage(`Can we schedule ${s.title.toLowerCase().replace("?", "")} with ${s.body}`)}
                      className="group flex flex-col items-start gap-2 rounded-2xl bg-[var(--bg-secondary)] px-5 py-4 text-left transition-all hover:bg-[var(--bg-tertiary)] border border-[var(--border)] hover:border-[var(--accent-primary)]/30 cursor-pointer"
                    >
                      <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">{s.title}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{s.body}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <ChatContent
                messages={messages}
                isLoading={isLoading}
                selectedSlot={selectedSlot}
                showInvitePreview={showInvitePreview}
                onSelectSlot={setSelectedSlot}
                onShowInvite={() => setShowInvitePreview(true)}
                onCloseInvite={() => setShowInvitePreview(false)}
                onSuggestionClick={handleSendMessage}
              />
            )}
          </div>

          <ChatInput
            onSend={handleSendMessage}
            placeholder="Schedule a meeting..."
          />
        </div>

        {/* ── Right column: Weekly Calendar ──────────────── */}
        {showCalendar && (
          <div className="relative flex shrink-0 flex-col border-l border-[var(--divider)] bg-[var(--bg-secondary)] animate-in slide-in-from-right duration-300" style={{ width: calendarWidth }}>
            {/* Resize handle */}
            <div
              onMouseDown={handleMouseDown}
              className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-10 hover:bg-[var(--accent-primary)] transition-colors"
            />
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--divider)] px-4 py-3">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">My Calendar</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowCalendar(false)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </Button>
            </div>
            {/* View switcher */}
            <div className="flex shrink-0 border-b border-[var(--divider)] px-2">
              {(["month", "week", "day", "list"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setCalendarView(v)}
                  className={cn(
                    "flex-1 py-2 text-[11px] font-semibold text-center transition-colors border-b-2 capitalize",
                    calendarView === v
                      ? "border-[var(--accent-primary)] text-[var(--accent-primary)]"
                      : "border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto">
              <MyCalendarEvents view={calendarView} />
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* TABLET (md to lg): 2-column (groups + chat)        */}
      {/* ═══════════════════════════════════════════════════ */}
      <div className="hidden md:flex md:flex-1 lg:hidden">
        {/* Left: groups */}
        <div className="flex w-[260px] shrink-0 flex-col border-r border-[var(--divider)] bg-[var(--bg-secondary)]">
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--divider)] px-4 py-4">
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Chat2meet</h2>
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
            {meetingEvents.length === 0 ? (
              <p className="px-3 py-2 text-xs text-[var(--text-tertiary)]">No meetings yet</p>
            ) : (
              meetingEvents.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => setActiveGroup(ev.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors cursor-pointer",
                    activeGroup === ev.id
                      ? "bg-[var(--bubble-action)] border border-[var(--bubble-action-border)] text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]",
                  )}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--bg-tertiary)] text-xs font-semibold text-[var(--text-secondary)]">
                    {ev.title.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{ev.title}</p>
                    <p className="truncate text-xs text-[var(--text-tertiary)]">{ev.participantIds?.slice(0, 2).join(", ") || ev.status}</p>
                  </div>
                </button>
              ))
            )}
          </div>
          <div className="border-t border-[var(--divider)] p-3">
            <div className="flex items-center justify-between px-2 py-1">
              <div className="flex items-center gap-2">
                <Avatar name={user?.displayName || user?.email || "User"} size={28} />
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {user?.displayName || user?.email?.split("@")[0] || "User"}
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Button>
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
                    onClick={() => handleSendMessage(`Can we schedule ${s.title.toLowerCase().replace("?", "")} with ${s.body}`)}
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
                messages={messages}
                isLoading={isLoading}
                selectedSlot={selectedSlot}
                showInvitePreview={showInvitePreview}
                onSelectSlot={setSelectedSlot}
                onShowInvite={() => setShowInvitePreview(true)}
                onCloseInvite={() => setShowInvitePreview(false)}
                onSuggestionClick={handleSendMessage}
              />
            )}
          </div>
          <ChatInput onSend={handleSendMessage} placeholder="Schedule a meeting..." />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* MOBILE (<md): Full-screen chat with bottom sheet   */}
      {/* No calendar — just suggestions + chat              */}
      {/* ═══════════════════════════════════════════════════ */}
      <div className="relative flex flex-1 flex-col md:hidden">
        {/* Nav */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--divider)] px-4 py-3">
          <h1 className="text-lg font-bold text-[var(--text-primary)]">Chat2meet</h1>
          <div className="flex items-center gap-1">
            <Link href="/network">
              <Button variant="ghost" size="icon" aria-label="Network">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M6 20c0-3 2-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </Button>
            </Link>
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
            <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
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
                      onClick={() => handleSendMessage(`Can we schedule ${s.title.toLowerCase().replace("?", "")} with ${s.body}`)}
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
              {meetingEvents.length > 0 && (
                <div className="px-4 pt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                    Meetings
                  </p>
                  <div className="flex flex-col gap-1">
                    {meetingEvents.map((ev) => (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => setActiveGroup(ev.id)}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[var(--bg-secondary)] cursor-pointer"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--bg-secondary)] text-sm font-semibold text-[var(--text-secondary)]">
                          {ev.title.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-[var(--text-primary)]">{ev.title}</p>
                          <p className="text-xs text-[var(--text-tertiary)]">{ev.participantIds?.join(", ") || ev.status}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <ChatContent
              messages={messages}
              isLoading={isLoading}
              selectedSlot={selectedSlot}
              showInvitePreview={showInvitePreview}
              onSelectSlot={setSelectedSlot}
              onShowInvite={() => setShowInvitePreview(true)}
              onCloseInvite={() => setShowInvitePreview(false)}
              onSuggestionClick={handleSendMessage}
            />
          )}
        </div>

        {/* Chat input — always visible */}
        <ChatInput onSend={handleSendMessage} placeholder="Schedule a meeting..." />
      </div>
    </div>
  );
}
