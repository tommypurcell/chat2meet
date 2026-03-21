import React, { useState } from "react";

type ChatInputProps = {
  onSend?: (message: string) => void;
  placeholder?: string;
};

export function ChatInput({
  onSend,
  placeholder = "Schedule a meeting...",
}: ChatInputProps) {
  const [value, setValue] = useState("");

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend?.(trimmed);
    setValue("");
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="flex items-end gap-2 border-t border-[var(--divider)] bg-[var(--bg-primary)] px-3 py-2">
      <form onSubmit={onSubmit} className="flex flex-1 items-end gap-2">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          rows={1}
          className="min-h-[38px] max-h-[70px] flex-1 resize-none rounded-[20px] border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-[9px] text-base leading-[1.35] text-[var(--text-primary)] placeholder:text-[var(--input-placeholder)] focus:outline-none focus:border-[var(--border-focused)] overflow-y-auto"
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className="flex h-[34px] w-[34px] shrink-0 cursor-pointer items-center justify-center rounded-full bg-[var(--accent-primary)] shadow-[var(--glow-primary)] transition-opacity disabled:opacity-30 disabled:cursor-default"
        >
          <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
            <path
              d="M3 8.5H14M9 3.5L14 8.5L9 13.5"
              stroke="var(--bubble-sender-text)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </form>
    </div>
  );
}
