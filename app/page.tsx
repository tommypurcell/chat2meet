"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { TimeChip } from "@/components/ui/TimeChip";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatMessageText } from "@/components/chat/ChatMessageText";
import { ChatInput } from "@/components/chat/ChatInput";
import { AvailabilityHeatmap } from "@/components/chat/AvailabilityHeatmap";
import { EventPollCard } from "@/components/chat/EventPollCard";
import {
  MyCalendarEvents,
  type CalendarView,
} from "@/components/calendar/MyCalendarEvents";
import { SchedulingParticipantsBar } from "@/components/chat/SchedulingParticipantsBar";
import { NetworkPickerModal } from "@/components/network/NetworkPickerModal";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth-context";
import { getFirebaseAuth, googleAuthProvider } from "@/lib/firebase-client";
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
import {
  extractCreateEventResultsFromMessages,
  extractEventPollCardsFromMessage,
  extractGuestEventResultsFromMessages,
  extractSuggestedTimesFromMessages,
} from "@/lib/chat-tool-outputs";
import { calendarDateInTimeZone } from "@/lib/date-in-timezone";
import { clearGuestSession, saveGuestSession } from "@/lib/guest-session";
import {
  GUEST_CREATE_EVENT_MESSAGE,
  GUEST_QUICK_STARTS,
} from "@/lib/guest-chat-starters";
import { cn, mergeUiMessageTextParts } from "@/lib/utils";
import {
  CHAT_SUGGESTIONS,
  MEETING_GROUPS,
  SAMPLE_INVITE,
} from "@/lib/mock-data";

const ROUTES = [
  { href: "/onboarding", label: "1. Sign Up" },
  { href: "/onboarding/preferences", label: "2. Preferences" },
  { href: "/", label: "3. Home" },
  { href: "/network", label: "4. Network" },
  { href: "/addnetwork", label: "Add network" },
  { href: "/invite/demo", label: "7. Invite" },
  { href: "/join/demo", label: "8. Join Gate" },
  { href: "/event/demo", label: "9. Event Detail" },
];

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

function getChatMessageVisibleText(msg: {
  parts?: unknown;
  content?: unknown;
}): string {
  const merged = mergeUiMessageTextParts(
    msg.parts as Parameters<typeof mergeUiMessageTextParts>[0],
  );
  const fromContent = typeof msg.content === "string" ? msg.content : "";
  return (merged || fromContent).trim();
}

type ChatUiMessage = {
  id?: string;
  role?: string;
  parts?: unknown;
  content?: unknown;
};

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function AssistantGoogleSignInPrompt({
  busy,
  emailBusy,
  error,
  emailError,
  showEmailForm,
  email,
  password,
  confirmPassword,
  onSignIn,
  onToggleEmailForm,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onEmailSignUp,
}: {
  busy: boolean;
  emailBusy: boolean;
  error: string | null;
  emailError: string | null;
  showEmailForm: boolean;
  email: string;
  password: string;
  confirmPassword: string;
  onSignIn: () => void;
  onToggleEmailForm: () => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onEmailSignUp: () => void;
}) {
  return (
    <div className="px-4 py-1">
      <div className="flex gap-2">
        <Avatar name="W" size={28} className="mt-1" />
        <div className="min-w-0">
          <div className="block w-fit max-w-[280px] min-w-0 rounded-2xl rounded-bl-[4px] bg-[var(--bubble-receiver)] px-3.5 py-2 text-base leading-[1.35] tracking-[-0.32px] text-[var(--bubble-receiver-text)]">
            <div className="min-w-0 break-words [word-break:break-word]">
              Create an account to manage your polls, connect your calendar, and schedule faster next time.
            </div>
          </div>
          <div className="flex flex-row gap-2 mt-2">


          <button
            type="button"
            onClick={onSignIn}
            disabled={busy}
            className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#dadce0] bg-white px-4 py-2.5 text-sm font-medium text-[#1f1f1f] shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <GoogleMark />
            {busy ? "Signing in..." : "Continue with Google"}
          </button>
          <button
            type="button"
            onClick={onToggleEmailForm}
            className="mt-2 block cursor-pointer rounded-xl border border-[var(--divider)] bg-[var(--bg-secondary)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-tertiary)]"
          >
            Sign up with email
          </button>

            </div>
          {showEmailForm && (
            <div className="mt-3 w-full max-w-[320px] rounded-xl border border-[var(--divider)] bg-[var(--bg-secondary)] p-3">
              <div className="grid gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => onEmailChange(e.target.value)}
                  placeholder="Email"
                  className="rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focused)]"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => onPasswordChange(e.target.value)}
                  placeholder="Password"
                  className="rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focused)]"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => onConfirmPasswordChange(e.target.value)}
                  placeholder="Confirm password"
                  className="rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focused)]"
                />
                <button
                  type="button"
                  onClick={onEmailSignUp}
                  disabled={emailBusy}
                  className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {emailBusy ? "Creating account..." : "Create account"}
                </button>
              </div>
            </div>
          )}
          {error && (
            <div className="mt-2 text-xs text-[var(--accent-danger)]">
              {error}
            </div>
          )}
          {emailError && (
            <div className="mt-2 text-xs text-[var(--accent-danger)]">
              {emailError}
            </div>
          )}
        </div>
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
  messages: ChatUiMessage[];
  isLoading: boolean;
  selectedSlot: string | null;
  showInvitePreview: boolean;
  onSelectSlot: (id: string) => void;
  onShowInvite: () => void;
  onCloseInvite: () => void;
  onSuggestionClick?: (text: string) => void;
}) {
  const lastMsg = messages.length > 0 ? messages[messages.length - 1] : undefined;
  const lastVisibleText = lastMsg ? getChatMessageVisibleText(lastMsg) : "";
  const showTypingRow =
    isLoading &&
    (messages.length === 0 ||
      lastMsg?.role === "user" ||
      (lastMsg?.role === "assistant" && lastVisibleText === ""));

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
        <>
          {messages.map((msg, index) => {
            if (
              msg.role === "assistant" &&
              getChatMessageVisibleText(msg) === "" &&
              isLoading &&
              index === messages.length - 1
            ) {
              return null;
            }
            return (
              <div key={msg.id}>
                <ChatMessage role={msg.role}>
                  <ChatMessageText
                    text={
                      mergeUiMessageTextParts(msg.parts) ||
                      (typeof msg.content === "string" ? msg.content : "")
                    }
                  />
                </ChatMessage>
                {msg.role === "assistant" &&
                  extractEventPollCardsFromMessage(msg).map((poll) => (
                    <EventPollCard
                      key={`${msg.id}-${poll.eventId}`}
                      poll={poll}
                    />
                  ))}
              </div>
            );
          })}

          {showTypingRow && (
            <ChatMessage role="assistant">
              <div className="flex h-[1.25em] items-center gap-1">
                <div
                  className="h-2 w-2 shrink-0 rounded-full bg-[var(--text-tertiary)] animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <div
                  className="h-2 w-2 shrink-0 rounded-full bg-[var(--text-tertiary)] animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <div
                  className="h-2 w-2 shrink-0 rounded-full bg-[var(--text-tertiary)] animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </ChatMessage>
          )}
        </>
      )}
    </div>
  );
}

const guestEmptyCardClass =
  "group flex w-full flex-col items-start gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] px-5 py-4 text-left transition-all hover:border-[var(--accent-primary)]/30 hover:bg-[var(--bg-tertiary)] cursor-pointer";

function GuestChatEmptyState({
  className,
  onCreateEvent,
  onQuickStart,
}: {
  className?: string;
  onCreateEvent: () => void;
  onQuickStart: (prompt: string) => void;
}) {
  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="mb-4 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--bg-tertiary)]">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
            stroke="var(--text-tertiary)"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p className="mb-6 max-w-md text-center text-sm font-medium text-[var(--text-secondary)]">
        Start a conversation to find meeting times
      </p>

      <div className="grid w-full max-w-2xl grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onCreateEvent}
          className={guestEmptyCardClass}
        >
          <p className="text-sm font-semibold text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent-primary)]">
            Create an event
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            Shareable poll — calendar or manual availability
          </p>
        </button>
        <Link
          href="/auth"
          className={cn(guestEmptyCardClass, "no-underline")}
        >
          <p className="text-sm font-semibold text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent-primary)]">
            Connect calendar
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            Sign in to link Google Calendar for smarter scheduling
          </p>
        </Link>
      </div>

      <p className="mb-2 mt-8 w-full max-w-2xl text-center text-xs font-medium text-[var(--text-tertiary)]">
        Quick start
      </p>
      <div className="flex w-full max-w-2xl flex-wrap justify-center gap-1.5">
        {GUEST_QUICK_STARTS.map((q) => (
          <button
            key={q.label}
            type="button"
            onClick={() => onQuickStart(q.prompt)}
            title={q.subtitle}
            className="rounded-full hover:cursor-pointer border border-[var(--border)] bg-[var(--bg-secondary)] px-2.5 py-1 text-[11px] font-medium leading-tight text-[var(--text-primary)] transition-colors hover:border-[var(--accent-primary)]/30 hover:bg-[var(--bg-tertiary)] sm:px-3 sm:text-xs"
          >
            {q.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Main page ────────────────────────────────────────── */
export default function Home() {
  const { theme, toggle } = useTheme();
  const { user, signOut, refresh } = useAuth();
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

  const userTimezoneRef = useRef("America/Los_Angeles");
  userTimezoneRef.current =
    user?.timezone ??
    (typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "America/Los_Angeles");

  /** Preformatted markdown for /api/chat — same payload as GET /api/calendar/google/events, sent as `calendarContext`. */
  const [calendarPromptForChat, setCalendarPromptForChat] = useState("");
  const calendarPromptForChatRef = useRef("");
  calendarPromptForChatRef.current = calendarPromptForChat;

  /** Saved events for side menu */
  const [savedEvents, setSavedEvents] = useState<Array<{
    id: string;
    title: string;
    status: string;
    createdAt: unknown;
    finalizedSlot?: { start: string; end: string };
  }>>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch saved events
  useEffect(() => {
    if (!user?.uid) {
      setSavedEvents([]);
      return;
    }

    const fetchEvents = async () => {
      try {
        const response = await fetch(`/api/events?userId=${user.uid}&limit=10`);
        if (response.ok) {
          const data = await response.json();
          setSavedEvents(data.events || []);
        }
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };

    fetchEvents();
  }, [user?.uid]);

  // Google events for chat + persist snapshot to Firestore `calendars/{uid}`.
  // Uses [user] (not []) so this runs after auth resolves; [] would fire before `user` exists.
  useEffect(() => {
    if (!user?.uid) {
      setCalendarPromptForChat("");
      return;
    }

    const uid = user.uid;

    const fetchCalendarData = async () => {
      try {
        const tz =
          user?.timezone ??
          Intl.DateTimeFormat().resolvedOptions().timeZone;
        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        const rangeLabel = `${calendarDateInTimeZone(today, tz)} → ${calendarDateInTimeZone(nextWeek, tz)}`;

        console.log("=== [BROWSER] Fetching calendar data ===");
        console.log("User ID:", uid);
        console.log("Time range:", today.toISOString(), "to", nextWeek.toISOString());

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

        console.log("=== [BROWSER] Calendar API response ===");
        console.log("Success:", data.success);
        console.log("Events:", data.events);
        console.log("Error:", data.error);

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
              tz,
            ),
          );

          void fetch("/api/calendars/sync", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              events: data.events,
              timeMin: today.toISOString(),
              timeMax: nextWeek.toISOString(),
              timezone: tz,
              displayName: user?.displayName ?? null,
            }),
          }).catch(() => {
            /* non-blocking; chat still works if sync fails */
          });
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
            userTimezone: userTimezoneRef.current,
          },
        }),
      }),
    [],
  );

  const [chatHydrated, setChatHydrated] = useState(false);

  const { messages, sendMessage, status, setMessages, stop } = useChat({
    transport,
  });

  useEffect(() => {
    const saved = loadChatMessages();
    if (saved.length > 0) {
      setMessages(saved);
    }
    setChatHydrated(true);
  }, [setMessages]);

  useEffect(() => {
    if (!chatHydrated) return;
    saveChatMessages(messages);
  }, [messages, chatHydrated]);

  useEffect(() => {
    if (user?.uid || messages.length === 0) return;

    const guestEvents = extractGuestEventResultsFromMessages(messages);
    const latestGuestEvent = guestEvents[guestEvents.length - 1];
    if (!latestGuestEvent) return;

    saveGuestSession({
      eventId: latestGuestEvent.eventId,
      guestId: latestGuestEvent.guestId,
      name: latestGuestEvent.creatorName,
      source: "agent",
    });
  }, [messages, user?.uid]);

  const guestEvents = useMemo(
    () => extractGuestEventResultsFromMessages(messages),
    [messages],
  );
  const latestGuestEvent = guestEvents[guestEvents.length - 1];
  const [signInBusy, setSignInBusy] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [emailFormOpen, setEmailFormOpen] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    setEmailFormOpen(false);
    setEmailError(null);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  }, [latestGuestEvent?.eventId]);

  const isLoading = status === "submitted" || status === "streaming";
  const chatStarted = messages.length > 0;

  const [chatInputDraft, setChatInputDraft] = useState("");
  const [chatInputFocusRequest, setChatInputFocusRequest] = useState(0);

  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [showInvitePreview, setShowInvitePreview] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [screensMenuOpen, setScreensMenuOpen] = useState(false);
  const [networkPickerOpen, setNetworkPickerOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarView, setCalendarView] = useState<CalendarView>("week");
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);
  const [calendarWidth, setCalendarWidth] = useState(350);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapWidth, setHeatmapWidth] = useState(350);
  const isResizing = useRef(false);
  const isResizingHeatmap = useRef(false);

  const chatScrollDesktopRef = useRef<HTMLDivElement>(null);
  const chatScrollTabletRef = useRef<HTMLDivElement>(null);
  const chatScrollMobileRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const nodes = [
      chatScrollDesktopRef.current,
      chatScrollTabletRef.current,
      chatScrollMobileRef.current,
    ].filter(Boolean) as HTMLDivElement[];
    for (const el of nodes) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, status, emailFormOpen, latestGuestEvent, signInError, emailError]);

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

  const handleHeatmapMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingHeatmap.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isResizingHeatmap.current) return;
      const newWidth = window.innerWidth - ev.clientX;
      setHeatmapWidth(Math.max(280, Math.min(700, newWidth)));
    };

    const handleMouseUp = () => {
      isResizingHeatmap.current = false;
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
    clearChatMessages();
    setMessages([]);
    setSelectedSlot(null);
    setShowInvitePreview(false);
    setChatInputDraft("");
    setEmailFormOpen(false);
    setEmailError(null);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  }

  function requestChatInputFocus() {
    setChatInputFocusRequest((n) => n + 1);
  }

  function handleGuestCreateEvent() {
    handleSendMessage(GUEST_CREATE_EVENT_MESSAGE);
  }

  function handleGuestQuickStart(prompt: string) {
    setChatInputDraft(prompt);
    requestChatInputFocus();
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

  async function claimGuestPoll() {
    if (!latestGuestEvent) return;
    const res = await fetch(`/api/events/${latestGuestEvent.eventId}/claim-guest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ guestId: latestGuestEvent.guestId }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error || "Failed to attach poll to your account");
    }
    clearGuestSession(latestGuestEvent.eventId);
  }

  async function handleGoogleSignInFromChat() {
    setSignInError(null);
    setEmailError(null);
    setSignInBusy(true);
    try {
      const auth = getFirebaseAuth();
      const credential = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await credential.user.getIdToken();
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        isNew?: boolean;
      };
      if (!res.ok) {
        throw new Error(data.error || "Could not create session");
      }
      await auth.signOut();
      await refresh();
      await claimGuestPoll();
      if (data.isNew) {
        router.push("/onboarding");
      } else {
        router.push("/");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Sign-in failed. Try again.";
      if (message.includes("auth/popup-closed-by-user")) {
        setSignInError(null);
        return;
      }
      setSignInError(message);
    } finally {
      setSignInBusy(false);
    }
  }

  async function handleEmailSignUpFromChat() {
    setEmailError(null);
    setSignInError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password || !confirmPassword) {
      setEmailError("Please fill out all three fields.");
      return;
    }
    if (password !== confirmPassword) {
      setEmailError("Passwords do not match.");
      return;
    }

    setEmailBusy(true);
    try {
      const auth = getFirebaseAuth();
      const credential = await createUserWithEmailAndPassword(
        auth,
        trimmedEmail,
        password,
      );
      const idToken = await credential.user.getIdToken();
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        isNew?: boolean;
      };
      if (!res.ok) {
        throw new Error(data.error || "Could not create session");
      }
      await auth.signOut();
      await refresh();
      await claimGuestPoll();
      if (data.isNew) {
        router.push("/onboarding");
      } else {
        router.push("/");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not create account.";
      setEmailError(message);
    } finally {
      setEmailBusy(false);
    }
  }

  return (
    <div className="flex h-[100dvh] min-h-0 w-full bg-[var(--bg-primary)] text-[var(--text-primary)]">

      {/* ═══════════════════════════════════════════════════ */}
      {/* DESKTOP (lg+): 2-column layout (sidebar + chat)    */}
      {/* ═══════════════════════════════════════════════════ */}
      <div className="hidden min-h-0 lg:flex lg:flex-1">

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
              <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Chat2Meet</h2>
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

          {/* Saved Events */}
          {isMounted ? (
            <div className="mt-3 flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-4">
              {savedEvents.length > 0 ? (
                <>
                  <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.8px] text-[var(--text-secondary)]">
                    Recent Events
                  </p>
                  {savedEvents.map((event) => {
                    const date = event.finalizedSlot?.start
                      ? new Date(event.finalizedSlot.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : 'TBD';
                    const statusBadge = event.status === 'confirmed' ? '✓' : event.status === 'draft' ? '○' : '·';

                    return (
                      <Link
                        key={event.id}
                        href={`/events/${event.id}`}
                        className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                      >
                        <span className="text-[var(--text-tertiary)]">{statusBadge}</span>
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium">{event.title}</p>
                          <p className="text-[11px] text-[var(--text-tertiary)]">{date}</p>
                        </div>
                      </Link>
                    );
                  })}
                </>
              ) : (
                <p className="px-3 py-4 text-xs text-[var(--text-tertiary)]">
                  No events yet. Create one to get started!
                </p>
              )}
            </div>
          ) : (
            <div className="mt-3 flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-4" />
          )}

          {/* User / Auth Section */}
          <div className="border-t border-[var(--divider)] p-3">
            {user ? (
              // Logged in - show user profile
              <div className="flex items-center gap-2 rounded-lg px-2 py-2">
                <Link href="/profile" className="flex items-center gap-2 min-w-0 flex-1 hover:opacity-80 transition-opacity">
                  <Avatar name={user.displayName ?? "User"} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">{user.displayName ?? "User"}</p>
                    <p className="truncate text-[11px] text-[var(--text-tertiary)]">Free plan</p>
                  </div>
                </Link>
                <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out" title="Sign out">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Button>
              </div>
            ) : (
              // Not logged in - show login button
              <Link href="/auth">
                <Button variant="primary" size="md" className="w-full justify-center font-medium">
                  Sign Up / Log In
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* ── Right column: Full-width Chat ──────────────── */}
        <div className="flex min-h-0 flex-1 flex-col bg-[var(--bg-sheet)]">
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
              {user ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="lg"
                    title="Availability heatmap"
                    className={cn(
                      "p-2",
                      showHeatmap &&
                        "bg-[var(--bg-tertiary)] text-[var(--accent-primary)]",
                    )}
                    onClick={() => setShowHeatmap(!showHeatmap)}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="3" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.75" />
                      <rect x="10" y="3" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.75" />
                      <rect x="17" y="3" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.75" />
                      <rect x="3" y="10" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.75" />
                      <rect x="10" y="10" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.75" />
                      <rect x="17" y="10" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.75" />
                      <rect x="3" y="17" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.75" />
                      <rect x="10" y="17" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.75" />
                      <rect x="17" y="17" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.75" />
                    </svg>
                  </Button>
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
                      <Avatar name={user.displayName ?? "User"} size={24} />
                    </Button>
                  </Link>
                </>
              ) : (
                <Link href="/auth">
                  <Button variant="primary" size="sm" className="font-medium">
                    Sign Up
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <div
            ref={chatScrollDesktopRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-2"
          >
            {!chatStarted ? (
              user ? (
                <div className="flex flex-col items-center justify-center h-full px-6 py-8">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg-tertiary)]">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="var(--text-tertiary)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-[var(--text-secondary)] mb-6">
                    Schedule a meeting without the back-and-forth
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
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-8">
                  <GuestChatEmptyState
                    className="w-full max-w-2xl"
                    onCreateEvent={handleGuestCreateEvent}
                    onQuickStart={handleGuestQuickStart}
                  />
                </div>
              )
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

            {!user && latestGuestEvent && !isLoading && (
              <AssistantGoogleSignInPrompt
                busy={signInBusy}
                emailBusy={emailBusy}
                error={signInError}
                emailError={emailError}
                showEmailForm={emailFormOpen}
                email={email}
                password={password}
                confirmPassword={confirmPassword}
                onSignIn={handleGoogleSignInFromChat}
                onToggleEmailForm={() => setEmailFormOpen((open) => !open)}
                onEmailChange={setEmail}
                onPasswordChange={setPassword}
                onConfirmPasswordChange={setConfirmPassword}
                onEmailSignUp={handleEmailSignUpFromChat}
              />
            )}
          </div>

          <SchedulingParticipantsBar
            participants={schedulingParticipants}
            onRemove={handleRemoveParticipant}
          />
          <ChatInput
            onSend={handleSendMessage}
            value={chatInputDraft}
            onValueChange={setChatInputDraft}
            focusRequestId={chatInputFocusRequest}
            placeholder={
              user
                ? "Message… type /network to view your network"
                : "Describe what you want to schedule…"
            }
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

        {showHeatmap && (
          <div
            className="relative flex min-h-0 shrink-0 flex-col border-l border-[var(--divider)] bg-[var(--bg-secondary)] animate-in slide-in-from-right duration-300"
            style={{ width: heatmapWidth }}
          >
            <div
              onMouseDown={handleHeatmapMouseDown}
              className="absolute bottom-0 left-0 top-0 z-10 w-1 cursor-col-resize hover:bg-[var(--accent-primary)] transition-colors"
            />
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--divider)] px-4 py-3">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Availability Heatmap
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowHeatmap(false)}
                aria-label="Close heatmap"
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
            <div className="min-h-0 flex-1 overflow-y-auto">
              <AvailabilityHeatmap
                userIds={[
                  user?.uid || "",
                  ...schedulingParticipants.map((p) => p.memberUserId),
                ].filter(Boolean)}
                startDate={new Date().toISOString().split("T")[0]}
                endDate={
                  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split("T")[0]
                }
                durationMinutes={60}
                timezone={user?.timezone || "America/Los_Angeles"}
              />
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* TABLET (md to lg): 2-column (groups + chat)        */}
      {/* ═══════════════════════════════════════════════════ */}
      <div className="hidden min-h-0 md:flex md:flex-1 lg:hidden">
        {/* Left: groups */}
        <div className="flex w-[260px] shrink-0 flex-col border-r border-[var(--divider)] bg-[var(--bg-secondary)]">
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--divider)] px-4 py-4">
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Chat2Meet</h2>
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
        <div className="flex min-h-0 flex-1 flex-col bg-[var(--bg-primary)]">
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
          <div
            ref={chatScrollTabletRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-2"
          >
            {!chatStarted ? (
              user ? (
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
                <div className="px-4 py-4">
                  <GuestChatEmptyState
                    onCreateEvent={handleGuestCreateEvent}
                    onQuickStart={handleGuestQuickStart}
                  />
                </div>
              )
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
            value={chatInputDraft}
            onValueChange={setChatInputDraft}
            focusRequestId={chatInputFocusRequest}
            placeholder={
              user
                ? "Message… type /network to view your network"
                : "Describe what you want to schedule…"
            }
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* MOBILE (<md): Full-screen chat with bottom sheet   */}
      {/* No calendar — just suggestions + chat              */}
      {/* ═══════════════════════════════════════════════════ */}
      <div className="relative flex min-h-0 flex-1 flex-col md:hidden">
        {/* Nav */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--divider)] px-4 py-3">
          <h1 className="text-lg font-bold text-[var(--text-primary)]">When2Meet</h1>
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
        <div
          ref={chatScrollMobileRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-2"
        >
          {!chatStarted ? (
            user ? (
              <>
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
              <div className="px-4 py-2">
                <GuestChatEmptyState
                  onCreateEvent={handleGuestCreateEvent}
                  onQuickStart={handleGuestQuickStart}
                />
              </div>
            )
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
        <ChatInput
          onSend={handleSendMessage}
          value={chatInputDraft}
          onValueChange={setChatInputDraft}
          focusRequestId={chatInputFocusRequest}
          placeholder={
            user
              ? "Message… type /network to view your network"
              : "Describe what you want to schedule…"
          }
        />
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
