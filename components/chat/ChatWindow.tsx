"use client";

import type { UIMessage } from "ai";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { EventCard } from "@/components/events/EventCard";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { CHAT_SUGGESTIONS, SAMPLE_SCHEDULING_EVENTS } from "@/lib/mock-data";

type ChatWindowProps = {
  messages: UIMessage[];
  onSuggestionClick: (text: string) => void;
};

export function ChatWindow({ messages, onSuggestionClick }: ChatWindowProps) {
  if (messages.length === 0) {
    return <WelcomeView onSuggestionClick={onSuggestionClick} />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-32 pt-4">
        {messages.map((message) => (
          <ChatMessage key={message.id} role={message.role as "user" | "assistant"}>
            {message.parts.map((part, i) => {
              if (part.type === "text") {
                return <span key={i} className="whitespace-pre-wrap">{part.text}</span>;
              }
              if (part.type === "step-start") return null;
              // Tool call in progress
              return (
                <span key={i} className="italic text-[var(--chat-muted)] text-sm">
                  Using tool…
                </span>
              );
            })}
          </ChatMessage>
        ))}
      </div>
    </div>
  );
}

function WelcomeView({ onSuggestionClick }: { onSuggestionClick: (text: string) => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-4 pb-32 pt-8 md:px-8">
        <div className="w-full max-w-[720px] text-center">
          <h1 className="text-balance text-[1.65rem] font-semibold tracking-tight text-[var(--chat-fg)] md:text-3xl">
            What should we schedule?
          </h1>
          <p className="mt-3 text-pretty text-sm text-[var(--chat-fg-muted)] md:text-base">
            Describe who needs to meet and any constraints. The agent negotiates
            availability like When2Meet—without the manual grid.
          </p>
        </div>

        <div className="mt-10 grid w-full max-w-[720px] gap-3 sm:grid-cols-2">
          {CHAT_SUGGESTIONS.map((s) => (
            <Card
              key={s.title}
              role="button"
              tabIndex={0}
              className="cursor-pointer p-4 text-left transition hover:bg-[var(--chat-surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--chat-accent)]"
              onClick={() => onSuggestionClick(s.body)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSuggestionClick(s.body);
                }
              }}
            >
              <CardHeader className="p-0">
                <CardTitle className="text-sm font-medium leading-snug">{s.title}</CardTitle>
                <CardDescription className="mt-1 text-left leading-relaxed">
                  {s.body}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <div className="mt-12 w-full max-w-[720px]">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--chat-muted)]">
            Active events
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {SAMPLE_SCHEDULING_EVENTS.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
