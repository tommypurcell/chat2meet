"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ChatContent } from "@/components/chat/ChatContent";
import { ChatInput } from "@/components/chat/ChatInput";
import { useAuth } from "@/lib/auth-context";

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState(false);
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/onboarding/chat" }), []);
  const { messages, sendMessage, status } = useChat({
    transport,
    onToolCall({ toolCall }) {
      if (toolCall.toolName === "completeOnboarding") {
        setOnboardingDone(true);
      }
    },
  });

  const isLoading = status === "submitted" || status === "streaming";
  const [calendarUrl, setCalendarUrl] = useState<string | null>(null);

  // Fetch calendar auth URL
  useEffect(() => {
    fetch("/api/calendar/google/auth-url")
      .then((res) => res.json())
      .then((data) => setCalendarUrl(data.url))
      .catch((err) => console.error("Error fetching calendar URL:", err));
  }, []);

  function handleSendMessage(text: string) {
    sendMessage({ parts: [{ type: "text", text }] });
  }

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--divider)] px-4 py-4">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" aria-label="Back">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Welcome to Chat2meet{user?.displayName ? `, ${user.displayName}` : ""}!</h1>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden flex flex-col max-w-2xl mx-auto w-full border-x border-[var(--divider)] bg-[var(--bg-secondary)]">
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {messages.length === 0 && !isLoading && (
            <div className="flex h-full flex-col items-center justify-center text-center px-6">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-primary)] shadow-[var(--glow-primary)]">
                <svg className="h-8 w-8 text-[var(--bubble-sender-text)]" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h2 className="text-xl font-bold mb-2">Let&apos;s get you set up</h2>
              <p className="text-[var(--text-secondary)] mb-8">
                I&apos;ll ask a few quick questions to learn your scheduling preferences.
              </p>
              <Button size="lg" onClick={() => handleSendMessage("Hi! I'm ready to set up my account.")}>
                Start Setup
              </Button>
            </div>
          )}

          <ChatContent
            messages={messages}
            isLoading={isLoading}
            selectedSlot={null}
            onSelectSlot={() => {}}
          />

          {/* Calendar connect card — shown after onboarding is done */}
          {onboardingDone && (
            <div className="mt-4 px-4 pb-4">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-tertiary)] p-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--bubble-action)] text-[var(--text-link)]">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="4" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2" />
                    <path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <h3 className="font-semibold text-[var(--text-primary)] mb-2">Connect Google Calendar</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                  Sync your calendar so Chat2meet can find your free times automatically.
                </p>
                <div className="flex flex-col gap-2">
                  {calendarUrl ? (
                    <a
                      href={calendarUrl}
                      onClick={() => {
                        if (user?.uid) {
                          sessionStorage.setItem("connectingUserId", user.uid);
                        }
                      }}
                    >
                      <Button variant="primary" className="w-full">Connect Now</Button>
                    </a>
                  ) : (
                    <Button variant="primary" className="w-full" disabled>Loading...</Button>
                  )}
                  <button
                    onClick={() => router.push("/")}
                    className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                  >
                    Skip — I&apos;ll do this later
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <ChatInput onSend={handleSendMessage} placeholder="Type your response..." />
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--divider);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--text-tertiary);
        }
      `}</style>
    </div>
  );
}
