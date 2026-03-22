"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
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
  ownerUserId: string;
};

export function NetworkPickerModal({
  open,
  onClose,
  ownerUserId: _ownerUserId,
}: NetworkPickerModalProps) {
  const titleId = useId();
  const [connections, setConnections] = useState<ConnectionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    const timeout = setTimeout(() => {
      const accepted = MOCK_CONNECTIONS.filter((c) => c.status === "accepted");
      setConnections(
        accepted.map((c) => ({
          id: c.id,
          memberUserId: c.userId,
          memberName: c.name,
          memberEmail: c.email,
        })),
      );
      setLoading(false);
    }, 400);

    return () => clearTimeout(timeout);
  }, [open]);

  if (!open) return null;

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
            Your network
          </h2>
          <p className="mt-1 text-[13px] text-[var(--text-tertiary)]">
            People you are connected with. View only — this does not change
            scheduling.
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
            connections.map((c) => (
              <div
                key={c.id}
                className="mb-2 flex w-full items-center gap-3 rounded-xl border border-[var(--border)] px-3 py-3"
              >
                <Avatar name={c.memberName} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                    {c.memberName}
                  </p>
                  <p className="truncate text-xs text-[var(--text-tertiary)]">
                    {c.memberEmail}
                  </p>
                </div>
              </div>
            ))}
        </div>

        <div className="shrink-0 flex justify-end border-t border-[var(--divider)] p-4">
          <Button type="button" variant="primary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
