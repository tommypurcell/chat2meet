import React, { useEffect, useRef, useState } from "react";

type ChatInputProps = {
  onSend?: (message: string) => void;
  placeholder?: string;
  /** When set with `onValueChange`, the draft is controlled by the parent. */
  value?: string;
  onValueChange?: (value: string) => void;
  /** Increment to move focus into the textarea (e.g. Ask AI / quick-start prefill). */
  focusRequestId?: number;
};

export function ChatInput({
  onSend,
  placeholder = "Schedule a meeting...",
  value: valueProp,
  onValueChange,
  focusRequestId = 0,
}: ChatInputProps) {
  const [internalValue, setInternalValue] = useState("");
  const controlled = valueProp !== undefined;
  const value = controlled ? valueProp! : internalValue;

  function setValue(next: string) {
    if (controlled) {
      onValueChange?.(next);
    } else {
      setInternalValue(next);
    }
  }
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (focusRequestId > 0) {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      const len = el.value.length;
      try {
        el.setSelectionRange(len, len);
      } catch {
        /* ignore */
      }
    }
  }, [focusRequestId]);

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
    <div className="flex items-end gap-2 border-t border-[var(--divider)] bg-[var(--bg-secondary)] px-3 py-2">
      <form onSubmit={onSubmit} className="flex flex-1 items-end gap-2">
        <textarea
          ref={textareaRef}
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
