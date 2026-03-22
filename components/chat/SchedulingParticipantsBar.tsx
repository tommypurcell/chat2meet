"use client";

import type { SchedulingParticipant } from "@/lib/types";
import { cn } from "@/lib/utils";

export type SchedulingParticipantsBarProps = {
  participants: SchedulingParticipant[];
  onRemove: (memberUserId: string) => void;
};

export function SchedulingParticipantsBar({
  participants,
  onRemove,
}: SchedulingParticipantsBarProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-wrap items-center gap-2 border-t border-[var(--divider)]",
        "bg-[var(--bg-secondary)] px-4 py-2",
      )}
    >
      <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
        Scheduling with
      </span>
      {participants.length === 0 ? (
        <span className="text-xs text-[var(--text-tertiary)]">
          No one selected for scheduling in this session.
        </span>
      ) : (
        <>
          {participants.map((p) => (
            <span
              key={p.memberUserId}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-tertiary)] py-0.5 pl-2.5 pr-1 text-xs text-[var(--text-primary)]"
            >
              <span className="max-w-[140px] truncate">{p.memberName}</span>
              <button
                type="button"
                onClick={() => onRemove(p.memberUserId)}
                className="rounded-full p-0.5 text-[var(--text-tertiary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
                aria-label={`Remove ${p.memberName}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M18 6L6 18M6 6l12 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </span>
          ))}
        </>
      )}
    </div>
  );
}
