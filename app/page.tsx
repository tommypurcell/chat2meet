"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { TimeChip } from "@/components/ui/TimeChip";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ActionBubble } from "@/components/chat/ActionBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import {
  MyCalendarEvents,
  type CalendarView,
} from "@/components/calendar/MyCalendarEvents";
import { SchedulingParticipantsBar } from "@/components/chat/SchedulingParticipantsBar";
import { NetworkPickerModal } from "@/components/network/NetworkPickerModal";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth-context";
import {
  clearChatMessages,
  loadChatMessages,
  saveChatMessages,
} from "@/lib/chat-storage";
import {
  loadSchedulingParticipants,
  saveSchedulingParticipants,
} from "@/lib/scheduling-storage";
import type { SchedulingParticipant } from "@/lib/types";
import {
  formatCalendarEventsForPrompt,
  formatCalendarLoadErrorPrompt,
  formatNoCalendarConnectedPrompt,
} from "@/lib/format-calendar-for-prompt";
import { cn, mergeUiMessageTextParts } from "@/lib/utils";
import {
  CHAT_SUGGESTIONS,
  MEETING_GROUPS,
  SAMPLE_INVITE,
} from "@/lib/mock-data";


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
  messages,
  isLoading,
  selectedSlot,
  showInvitePreview,
  onSelectSlot,
  onShowInvite,
  onCloseInvite,
  onSuggestionClick,
}: {
  messages: any[];
  isLoading: boolean;
  selectedSlot: string | null;
  showInvitePreview: boolean;
  onSelectSlot: (id: string) => void;
  onShowInvite: () => void;
  onCloseInvite: () => void;
  onSuggestionClick?: (text: string) => void;
}) {
  const suggestedTimes = messages
    .filter((msg) => msg.role === "assistant")
    .flatMap((msg) => {
      return msg.toolResults
        ?.filter((result: any) => result.toolName === "suggestTimes")
        .flatMap((result: any) => result.result?.suggestedTimes || []) || [];
    });

  const createdEvents = messages
    .filter((msg) => msg.role === "assistant")
    .flatMap((msg) => {
      return msg.toolResults
        ?.filter(
          (result: any) =>
            result.toolName === "createEvent" && result.result?.success,
        )
        .map((result: any) => result.result) || [];
    });

  return (
    <div>
      {messages.length === 0 && !isLoading ? (
        // Show empty state with suggestions (only if no messages AND not loading)
        <div className="flex flex-col gap-2 px-4 py-4">
          <p className="text-sm text-[var(--text-secondary)]">Start a conversation to find meeting times</p>
          {CHAT_SUGGESTIONS.map((s) => (
            <button
              key={s.title}
              type="button"
              className="flex items-start gap-3 rounded-xl bg-[var(--bg-secondary)] px-3 py-2.5 text-left transition-colors hover:bg-[var(--bg-tertiary)]"
              onClick={() => onSuggestionClick?.(s.body)}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)]">{s.title}</p>
                <p className="text-xs text-[var(--text-tertiary)]">{s.body}</p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        messages.map((msg) => (
          <ChatMessage key={msg.id} role={msg.role}>
            <span className="whitespace-pre-wrap">
              {mergeUiMessageTextParts(msg.parts) ||
                (typeof msg.content === "string" ? msg.content : "")}
            </span>
          </ChatMessage>
        ))
      )}

      {suggestedTimes.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 py-2">
          {suggestedTimes.map((slot: any) => (
            <TimeChip
              key={slot.id}
              time={slot.time}
              date={slot.date}
              selected={selectedSlot === slot.id}
              onClick={() => onSelectSlot(slot.id)}
            />
          ))}
        </div>
      )}

      {selectedSlot && !showInvitePreview && (
        <ActionBubble
          text="Create calendar invite"
          onClick={onShowInvite}
        />
      )}

      {showInvitePreview && (
        <InvitePreview onClose={onCloseInvite} />
      )}

      {createdEvents.map((evt: any) => (
        <div
          key={evt.eventId}
          className="mx-4 mb-2 rounded-2xl border border-green-500/30 bg-green-500/10 p-4"
        >
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-sm font-semibold">Event created</span>
          </div>
          <p className="mt-1.5 text-sm font-medium text-[var(--text-primary)]">
            {evt.summary}
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
            {new Date(evt.start).toLocaleString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
            {" – "}
            {new Date(evt.end).toLocaleString(undefined, {
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
          {evt.attendees?.length > 0 && (
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">
              With: {evt.attendees.join(", ")}
            </p>
          )}
          {evt.htmlLink && (
            <a
              href={evt.htmlLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Open in Google Calendar
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Main page ────────────────────────────────────────── */
export default function Home() {
  const { theme, toggle } = useTheme();
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [schedulingParticipants, setSchedulingParticipants] = useState<
    SchedulingParticipant[]
  >([]);
  const schedulingParticipantsRef = useRef<SchedulingParticipant[]>([]);

  useEffect(() => {
    schedulingParticipantsRef.current = schedulingParticipants;
  }, [schedulingParticipants]);

  useEffect(() => {
    if (pathname === "/") {
      setSchedulingParticipants(loadSchedulingParticipants());
    }
  }, [pathname]);

  useEffect(() => {
    saveSchedulingParticipants(schedulingParticipants);
  }, [schedulingParticipants]);

  /** Keep in sync during render (not only in useEffect) so the first chat request sends the real Firebase uid. */
  const currentUserIdRef = useRef<string | undefined>(undefined);
  currentUserIdRef.current = user?.uid;

  /** Preformatted markdown for /api/chat — same payload as GET /api/calendar/google/events, sent as `calendarContext`. */
  const [calendarPromptForChat, setCalendarPromptForChat] = useState("");
  const calendarPromptForChatRef = useRef("");
  calendarPromptForChatRef.current = calendarPromptForChat;

  useEffect(() => {
    if (!user?.uid) {
      setCalendarPromptForChat("");
      return;
    }

    const uid = user.uid;

    const fetchCalendarData = async () => {
      try {
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        const rangeLabel = `${today.toISOString().split("T")[0]} → ${nextWeek.toISOString().split("T")[0]}`;

        const tz = user?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
        const response = await fetch(
          `/api/calendar/google/events?userId=${uid}&timeMin=${today.toISOString()}&timeMax=${nextWeek.toISOString()}&maxResults=100&timeZone=${encodeURIComponent(tz)}`,
        );

        const data = (await response.json()) as {
          success?: boolean;
          events?: Array<{
            summary?: string;
            start?: string | null;
            end?: string | null;
          }>;
          error?: string;
        };

        if (!response.ok || data.error) {
          const msg = data.error || response.statusText;
          const noAccount =
            response.status === 404 ||
            (typeof msg === "string" && msg.includes("No active Google Calendar"));
          setCalendarPromptForChat(
            noAccount
              ? formatNoCalendarConnectedPrompt(uid)
              : formatCalendarLoadErrorPrompt(msg || "Request failed"),
          );
          return;
        }

        if (data.success && Array.isArray(data.events)) {
          setCalendarPromptForChat(
            formatCalendarEventsForPrompt(
              uid,
              data.events,
              `next 7 days (${rangeLabel})`,
              user?.timezone ?? "America/Los_Angeles",
            ),
          );
        } else {
          setCalendarPromptForChat("");
        }
      } catch (e) {
        setCalendarPromptForChat(
          formatCalendarLoadErrorPrompt(
            e instanceof Error ? e.message : "fetch failed",
          ),
        );
      }
    };

    fetchCalendarData();
  }, [user]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        credentials: "include",
        prepareSendMessagesRequest: async (opts) => ({
          body: {
            ...opts.body,
            id: opts.id,
            messages: opts.messages,
            trigger: opts.trigger,
            messageId: opts.messageId,
            schedulingParticipants: schedulingParticipantsRef.current,
            currentUserId: currentUserIdRef.current ?? undefined,
            calendarContext: calendarPromptForChatRef.current || undefined,
          },
        }),
      }),
    [],
  );

  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [chatHydrated, setChatHydrated] = useState(false);
  const lastGroupRef = useRef<string | null>(activeGroup);

  const { messages, sendMessage, status, setMessages, stop } = useChat({
    transport,
  });

  useEffect(() => {
    const saved = loadChatMessages(activeGroup);
    setMessages(saved || []);
    lastGroupRef.current = activeGroup; // Lock the current group so we don't accidentally save old messages into a new group during the swap cycle
    setChatHydrated(true);
  }, [activeGroup, setMessages]);

  useEffect(() => {
    if (!chatHydrated) return;
    if (activeGroup !== lastGroupRef.current) return;
    saveChatMessages(activeGroup, messages);
  }, [messages, activeGroup, chatHydrated]);

  const isLoading = status === "submitted" || status === "streaming";
  const chatStarted = messages.length > 0;

  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [showInvitePreview, setShowInvitePreview] = useState(false);

  const [networkPickerOpen, setNetworkPickerOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarView, setCalendarView] = useState<CalendarView>("week");
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);
  const [calendarWidth, setCalendarWidth] = useState(350);
  const isResizing = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = window.innerWidth - ev.clientX;
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

  function handleSendMessage(text: string) {
    const trimmed = text.trim();
    if (trimmed.toLowerCase() === "/network") {
      if (user?.uid) setNetworkPickerOpen(true);
      return;
    }
    sendMessage({ parts: [{ type: "text", text }] });
  }

  function handleClearChat() {
    if (status === "streaming" || status === "submitted") {
      stop();
    }
    clearChatMessages(activeGroup);
    setMessages([]);
    setSelectedSlot(null);
    setShowInvitePreview(false);
  }

  function handleRemoveParticipant(memberUserId: string) {
    setSchedulingParticipants((prev) =>
      prev.filter((p) => p.memberUserId !== memberUserId),
    );
  }

  async function handleSignOut() {
    await signOut();
    router.push("/login");
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

          {/* New group button */}
          <div className="px-3 pt-3">
            <Button
              variant="secondary"
              size="md"
              className="w-full justify-start gap-2 cursor-pointer"
              onClick={() => {
                handleClearChat();
                if (user?.uid) setNetworkPickerOpen(true);
              }}
            >
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
                onClick={() => {
                  setActiveGroup(g.id);
                }}
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
              <Link href="/profile" className="flex items-center gap-2 min-w-0 flex-1 hover:opacity-80 transition-opacity">
                <Avatar name={user?.displayName ?? "User"} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--text-primary)]">{user?.displayName ?? "User"}</p>
                  <p className="truncate text-[11px] text-[var(--text-tertiary)]">Free plan</p>
                </div>
              </Link>
              <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out" title="Sign out">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Button>
            </div>
          </div>
        </div>

        {/* ── Right column: Full-width Chat ──────────────── */}
        <div className="flex flex-1 flex-col bg-[var(--bg-sheet)]">
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--divider)] px-5 py-4">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="text-lg font-semibold">Chat</h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearChat}
                disabled={messages.length === 0}
                title="Clear chat and start over"
                className="shrink-0 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-40"
              >
                Clear
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="lg"
                title="My calendar"
                className={cn(
                  "p-2",
                  showCalendar &&
                    "bg-[var(--bg-tertiary)] text-[var(--accent-primary)]",
                )}
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
                  <Avatar name={user?.displayName ?? "User"} size={24} />
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

          <SchedulingParticipantsBar
            participants={schedulingParticipants}
            onRemove={handleRemoveParticipant}
          />
          <ChatInput
            onSend={handleSendMessage}
            placeholder="Message… type /network to view your network"
          />
        </div>

        {showCalendar && (
          <div
            className="relative flex min-h-0 shrink-0 flex-col border-l border-[var(--divider)] bg-[var(--bg-secondary)] animate-in slide-in-from-right duration-300"
            style={{ width: calendarWidth }}
          >
            <div
              onMouseDown={handleMouseDown}
              className="absolute bottom-0 left-0 top-0 z-10 w-1 cursor-col-resize hover:bg-[var(--accent-primary)] transition-colors"
            />
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--divider)] px-4 py-3">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                My Calendar
              </h2>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCalendarRefreshKey((k) => k + 1)}
                  aria-label="Refresh calendar"
                  title="Refresh"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowCalendar(false)}
                  aria-label="Close calendar"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M18 6L6 18M6 6l12 12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </Button>
              </div>
            </div>
            <div className="flex shrink-0 border-b border-[var(--divider)] px-2">
              {(["month", "week", "day", "list"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setCalendarView(v)}
                  className={cn(
                    "flex-1 py-2 text-center text-[11px] font-semibold capitalize transition-colors border-b-2",
                    calendarView === v
                      ? "border-[var(--accent-primary)] text-[var(--accent-primary)]"
                      : "border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <MyCalendarEvents key={calendarRefreshKey} view={calendarView} />
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
          {/* New group button */}
          <div className="px-3 pt-3">
            <Button
              variant="secondary"
              size="md"
              className="w-full justify-start gap-2 cursor-pointer"
              onClick={() => {
                handleClearChat();
                if (user?.uid) setNetworkPickerOpen(true);
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              New meeting
            </Button>
          </div>
          <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pt-3 pb-4">
            {MEETING_GROUPS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  setActiveGroup(g.id);
                }}
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
              <Avatar name={user?.displayName ?? "User"} size={28} />
              <span className="text-sm font-medium text-[var(--text-primary)] flex-1 truncate">{user?.displayName ?? "User"}</span>
              <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out" title="Sign out">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Button>
            </div>
          </div>
        </div>

        {/* Right: chat */}
        <div className="flex flex-1 flex-col bg-[var(--bg-primary)]">
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--divider)] px-5 py-4">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="text-lg font-semibold">Chat</h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearChat}
                disabled={messages.length === 0}
                title="Clear chat and start over"
                className="shrink-0 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-40"
              >
                Clear
              </Button>
            </div>
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
          <SchedulingParticipantsBar
            participants={schedulingParticipants}
            onRemove={handleRemoveParticipant}
          />
          <ChatInput onSend={handleSendMessage} placeholder="Message… type /network to view your network" />
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
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleClearChat}
              disabled={messages.length === 0}
              aria-label="Clear chat and start over"
              title="Clear chat"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Button>
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
            <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out" title="Sign out">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
        <SchedulingParticipantsBar
          participants={schedulingParticipants}
          onRemove={handleRemoveParticipant}
        />
        <ChatInput onSend={handleSendMessage} placeholder="Message… type /network to view your network" />
      </div>

      {user?.uid ? (
        <NetworkPickerModal
          open={networkPickerOpen}
          ownerUserId={user.uid}
          onClose={() => setNetworkPickerOpen(false)}
        />
      ) : null}
    </div>
  );
}
