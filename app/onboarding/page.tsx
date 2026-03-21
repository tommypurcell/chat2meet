"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ChatContent } from "@/components/chat/ChatContent";
import { ChatInput } from "@/components/chat/ChatInput";
import { useAuth } from "@/lib/auth-context";

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { messages, append, status } = useChat({
    api: "/api/chat/onboarding",
    onToolCall({ toolCall }) {
      if (toolCall.toolName === "completeOnboarding") {
        setTimeout(() => router.push("/"), 2000);
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
    append({ role: "user", content: text });
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
          <h1 className="text-xl font-bold">Welcome, {user?.displayName || "new user"}!</h1>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden flex flex-col max-w-2xl mx-auto w-full border-x border-[var(--divider)] bg-[var(--bg-secondary)]">
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {messages.length === 0 && !isLoading && (
            <div className="flex h-full flex-col items-center justify-center text-center px-6">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-primary)] shadow-[var(--glow-primary)]">
                <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none">
                  <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="2" />
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
              <h2 className="text-xl font-bold mb-2">Let&apos;s get you set up</h2>
              <p className="text-[var(--text-secondary)] mb-8">
                I&apos;ll help you connect your calendar and set your meeting preferences in just a few seconds.
              </p>
              <Button size="lg" onClick={() => handleSendMessage("Hi, I'm ready to set up my account!")}>
                Start Onboarding
              </Button>
            </div>
          )}
          
          <ChatContent 
            messages={messages} 
            isLoading={isLoading} 
            selectedSlot={null}
            onSelectSlot={() => {}}
          />

          {/* Special UI for Calendar Connection */}
          {messages.some(m => m.role === "assistant" && m.content.toLowerCase().includes("calendar") && !m.content.toLowerCase().includes("preferences")) && (
            <div className="mt-4 px-4 pb-4">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-tertiary)] p-6 text-center">
                <h3 className="font-semibold mb-2">Google Calendar</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-4">Connect to automatically sync your free/busy times.</p>
                {calendarUrl ? (
                  <Link href={calendarUrl}>
                    <Button variant="primary" className="w-full">Connect Now</Button>
                  </Link>
                ) : (
                  <Button variant="primary" className="w-full" disabled>Loading...</Button>
                )}
                <button 
                  onClick={() => handleSendMessage("I'll skip calendar for now. Let's talk about preferences.")}
                  className="mt-3 text-xs text-[var(--text-tertiary)] hover:underline"
                >
                  Skip for now
                </button>
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
