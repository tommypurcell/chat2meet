"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { SchedulingParticipant } from "@/lib/types";
import { MOCK_CONNECTIONS } from "@/lib/data";

type ConnectionRow = {
  id: string;
  memberUserId: string;
  memberName: string;
  memberEmail: string;
};

export type NetworkPickerModalProps = {
  open: boolean;
  onClose: () => void;
  /** Called when user confirms; parent persists and navigates */
  onConfirm: (selected: SchedulingParticipant[]) => void;
  ownerUserId: string;
};

export function NetworkPickerModal({
  open,
  onClose,
  onConfirm,
  ownerUserId,
}: NetworkPickerModalProps) {
  const titleId = useId();
  const [connections, setConnections] = useState<ConnectionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    
    setLoading(true);
    setError(null);
    setSelected(new Set());

    // Simulate async mock load
    const timeout = setTimeout(() => {
      const accepted = MOCK_CONNECTIONS.filter(c => c.status === "accepted");
      setConnections(accepted.map(c => ({
        id: c.id,
        memberUserId: c.userId,
        memberName: c.name,
        memberEmail: c.email
      })));
      setLoading(false);
    }, 400);

    return () => clearTimeout(timeout);
  }, [open]);

  if (!open) return null;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function confirm() {
    const picked = connections
      .filter((c) => selected.has(c.memberUserId))
      .map(
        (c): SchedulingParticipant => ({
          memberUserId: c.memberUserId,
          memberName: c.memberName,
          memberEmail: c.memberEmail,
        }),
      );
    onConfirm(picked);
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
        aria-labelledby={titleId}
        className={cn(
          "relative z-10 flex max-h-[min(520px,85vh)] w-full max-w-md flex-col rounded-2xl border border-[var(--border)]",
          "bg-[var(--bg-secondary)] shadow-[var(--shadow-elevated)]",
        )}
      >
        <div className="shrink-0 border-b border-[var(--divider)] p-4">
          <h2
            id={titleId}
            className="text-base font-semibold text-[var(--text-primary)]"
          >
            Who are you scheduling with?
          </h2>
          <p className="mt-1 text-[13px] text-[var(--text-tertiary)]">
            Choose people from your network. Their account IDs are sent to the
            assistant automatically — you will not need to paste user IDs.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {loading && (
            <p className="px-1 py-6 text-center text-sm text-[var(--text-secondary)]">
              Loading your network…
            </p>
          )}
          {error && (
            <p className="px-1 py-4 text-center text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {!loading && !error && connections.length === 0 && (
            <div className="flex flex-col items-center gap-3 px-2 py-8 text-center">
              <p className="text-sm text-[var(--text-secondary)]">
                No accepted connections yet. Add friends from your network
                first.
              </p>
              <Link href="/network">
                <Button variant="secondary" size="sm">
                  Open network
                </Button>
              </Link>
            </div>
          )}
          {!loading &&
            !error &&
            connections.map((c) => {
              const isOn = selected.has(c.memberUserId);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggle(c.memberUserId)}
                  className={cn(
                    "mb-2 flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                    isOn
                      ? "border-[var(--accent-primary)] bg-[var(--bg-tertiary)]"
                      : "border-[var(--border)] hover:bg-[var(--bg-tertiary)]",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                      isOn
                        ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]"
                        : "border-[var(--divider)] bg-[var(--bg-primary)]",
                    )}
                    aria-hidden
                  >
                    {isOn && (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        className="text-white"
                      >
                        <path
                          d="M2 6l3 3 5-6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  <Avatar name={c.memberName} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                      {c.memberName}
                    </p>
                    <p className="truncate text-xs text-[var(--text-tertiary)]">
                      {c.memberEmail}
                    </p>
                  </div>
                </button>
              );
            })}
        </div>

        <div className="shrink-0 flex justify-end gap-2 border-t border-[var(--divider)] p-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={confirm}
            disabled={selected.size === 0 || loading}
          >
            Use selected
          </Button>
        </div>
      </div>
    </div>
  );
}
