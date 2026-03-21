"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/Button";

export function ChatInput() {
  const [value, setValue] = useState("");

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    setValue("");
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    submit();
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[var(--chat-bg)] via-[var(--chat-bg)] to-transparent pb-4 pt-10 md:pb-6">
      <div className="pointer-events-auto mx-auto w-full max-w-[720px] px-3 md:px-4">
        <form
          onSubmit={onSubmit}
          className="relative flex items-end gap-2 rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-input-bg)] px-3 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.28)]"
        >
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Message When2Meet Agent…"
            rows={1}
            className="max-h-[200px] min-h-[44px] flex-1 resize-none bg-transparent py-2.5 text-[15px] leading-relaxed text-[var(--chat-fg)] placeholder:text-[var(--chat-muted)] focus:outline-none"
          />
          <div className="flex shrink-0 items-center gap-1 pb-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Attach (coming soon)"
              disabled
            >
              <PaperclipIcon />
            </Button>
            <Button
              type="submit"
              variant="accent"
              size="icon"
              disabled={!value.trim()}
              aria-label="Send message"
            >
              <SendIcon />
            </Button>
          </div>
        </form>
        <p className="mt-2 text-center text-[11px] text-[var(--chat-muted)]">
          Agent can make mistakes. Double-check proposed times before sharing.
        </p>
      </div>
    </div>
  );
}

function SendIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden
    >
      <path
        d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.55A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
