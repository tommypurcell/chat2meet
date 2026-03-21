"use client";

import { RECENT_EVENTS } from "@/lib/mock-data";
import { EventList } from "./EventList";
import { NewEventButton } from "./NewEventButton";

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r border-[var(--chat-border)] bg-[var(--chat-sidebar)] transition-transform duration-200 ease-out md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="flex h-14 shrink-0 items-center gap-2 px-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--chat-muted)] hover:bg-[var(--chat-surface-hover)] hover:text-[var(--chat-fg)] md:hidden"
            aria-label="Close menu"
          >
            <PanelLeftIcon />
          </button>
          <span className="truncate text-sm font-semibold tracking-tight text-[var(--chat-fg)]">
            When2Meet Agent
          </span>
        </div>

        <div className="px-2">
          <NewEventButton />
        </div>

        <div className="mt-4 flex min-h-0 flex-1 flex-col px-2">
          <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-[var(--chat-muted)]">
            Recent
          </p>
          <EventList events={RECENT_EVENTS} />
        </div>

        <div className="border-t border-[var(--chat-border)] p-2">
          <div className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-[var(--chat-fg-muted)] hover:bg-[var(--chat-surface-hover)]">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--chat-accent-soft)] text-xs font-medium text-[var(--chat-accent)]">
              You
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[var(--chat-fg)]">Account</p>
              <p className="truncate text-xs text-[var(--chat-muted)]">Free plan</p>
            </div>
          </div>
        </div>
      </aside>

      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          aria-label="Dismiss sidebar"
          onClick={onClose}
        />
      ) : null}
    </>
  );
}

function PanelLeftIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M9 9h6M9 15h6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
