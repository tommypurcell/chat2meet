import type { EventItem } from "@/lib/types";

type EventListProps = {
  events: EventItem[];
};

export function EventList({ events }: EventListProps) {
  return (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto pb-4">
      {events.map((e) => (
        <button
          key={e.id}
          type="button"
          className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-[var(--text-secondary)] transition hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
        >
          <span className="line-clamp-2">{e.title}</span>
        </button>
      ))}
    </nav>
  );
}
