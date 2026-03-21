"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { Sidebar } from "@/components/sidebar/Sidebar";

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { messages, sendMessage, status } = useChat();
  const isLoading = status === "submitted" || status === "streaming";

  function handleSend(text: string) {
    sendMessage({ parts: [{ type: "text", text }] });
  }

  return (
    <div className="flex h-[100dvh] min-h-0 w-full bg-[var(--chat-bg)] text-[var(--chat-fg)]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-[var(--chat-border)] px-2 md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-[var(--chat-muted)] hover:bg-[var(--chat-surface-hover)] hover:text-[var(--chat-fg)]"
            aria-label="Open menu"
          >
            <MenuIcon />
          </button>
          <span className="truncate text-sm font-medium text-[var(--chat-fg-muted)]">
            When2Meet Agent
          </span>
        </header>

        <div className="relative flex min-h-0 flex-1 flex-col">
          <ChatWindow messages={messages} onSuggestionClick={handleSend} />
          <ChatInput onSend={handleSend} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}

function MenuIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
