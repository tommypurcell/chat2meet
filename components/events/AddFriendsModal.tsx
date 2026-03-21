"use client";

import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export type AddFriendsModalProps = {
  open: boolean;
  onClose: () => void;
  onInvite?: (emails: string[]) => void;
  title?: string;
};

export function AddFriendsModal({
  open,
  onClose,
  onInvite,
  title = "Add friends to this event",
}: AddFriendsModalProps) {
  const [raw, setRaw] = useState("");
  const labelId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function submit() {
    const emails = raw
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    onInvite?.(emails);
    setRaw("");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        className={cn(
          "relative z-10 w-full max-w-md rounded-2xl border border-[var(--chat-border)]",
          "bg-[var(--chat-input-bg)] p-4 shadow-xl",
        )}
      >
        <h2 id={labelId} className="text-base font-semibold text-[var(--chat-fg)]">
          {title}
        </h2>
        <p className="mt-1 text-xs text-[var(--chat-muted)]">
          Paste emails separated by commas, semicolons, or new lines.
        </p>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={4}
          placeholder="alex@company.com, sam@school.edu"
          className={cn(
            "mt-3 w-full resize-y rounded-xl border border-[var(--chat-border)] bg-[var(--chat-bg)]",
            "px-3 py-2 text-sm text-[var(--chat-fg)] placeholder:text-[var(--chat-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--chat-accent)]/40",
          )}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="accent" onClick={submit}>
            Send invites
          </Button>
        </div>
      </div>
    </div>
  );
}
