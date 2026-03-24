"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  EVENT_GRID_DAY_COLUMN_PX,
  EVENT_GRID_SLOT_HEIGHT_PX,
  EVENT_GRID_TIME_COLUMN_PX,
  defaultEventTimeSlotLabels,
  getVisibleSlotRange,
} from "@/lib/event-grid-slots";
import type { EventPollCardResult } from "@/lib/chat-tool-outputs";

type EventPollCardProps = {
  poll: EventPollCardResult;
};

type HoveredSlot = EventPollCardResult["gridSlots"][number];

function getHeatColor(score: number): string {
  if (score === 0) return "var(--bg-calendar-cell)";
  if (score === 1) return "var(--accent-primary)";
  const opacity = 0.15 + score * 0.85;
  return `color-mix(in srgb, var(--accent-primary) ${opacity * 100}%, transparent)`;
}

export function EventPollCard({ poll }: EventPollCardProps) {
  const [hoveredSlot, setHoveredSlot] = useState<HoveredSlot | null>(null);
  const [copied, setCopied] = useState(false);
  const days = useMemo(
    () =>
      Array.from(new Set(poll.gridSlots.map((slot) => slot.date))).map((date) => {
        const first = poll.gridSlots.find((slot) => slot.date === date);
        return {
          date,
          label: first?.dateLabel || date,
        };
      }),
    [poll.gridSlots],
  );
  const { startSlotIdx, endSlotIdx } = useMemo(
    () =>
      getVisibleSlotRange({
        earliestTime: poll.event.earliestTime,
        latestTime: poll.event.latestTime,
        padSlots: 4,
      }),
    [poll.event.earliestTime, poll.event.latestTime],
  );
  const timeSlots = useMemo(
    () => defaultEventTimeSlotLabels(startSlotIdx, endSlotIdx),
    [startSlotIdx, endSlotIdx],
  );
  const gridWidth = EVENT_GRID_TIME_COLUMN_PX + days.length * EVENT_GRID_DAY_COLUMN_PX;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(poll.event.shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error("Failed to copy share link:", error);
    }
  }

  return (
    <div className="ml-10 mr-4 mt-2 w-fit max-w-[min(720px,calc(100vw-4rem))] rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-[var(--text-primary)]">
            {poll.event.title}
          </h3>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {poll.event.dateRangeStart} to {poll.event.dateRangeEnd} • {poll.event.timezone}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-lg border border-[var(--divider)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)]"
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
          <Link
            href={`/events/${poll.eventId}`}
            className="rounded-lg border border-[var(--divider)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)]"
          >
            Open full page
          </Link>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[var(--text-tertiary)]">
        <span>{poll.participants.length} participants</span>
        <span>{poll.everyoneAvailableSlots.length} full-overlap slots</span>
        {poll.missingResponders.length > 0 && (
          <span>Missing: {poll.missingResponders.join(", ")}</span>
        )}
      </div>

  

      <div className="mt-4 w-fit rounded-xl border border-[var(--divider)] bg-[var(--bg-tertiary)] p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-[11px] font-medium text-[var(--text-secondary)]">
            Availability grid
          </p>
          <p className="text-[10px] text-[var(--text-tertiary)]">
            Hover a cell to see who&apos;s free
          </p>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
          <div className="min-h-[220px] w-full rounded-xl border border-[var(--divider)] bg-[var(--bg-secondary)] p-3 lg:w-60">
            {hoveredSlot ? (
              <>
                <div className="text-[16px] font-semibold text-[var(--text-primary)]">
                  {hoveredSlot.availableUsers.length}/{hoveredSlot.totalParticipants} available
                </div>
                <div className="mt-1 text-[12px] text-[var(--text-secondary)]">
                  {hoveredSlot.dateLabel} {hoveredSlot.time}
                </div>
                <div className="mt-5 grid grid-cols-2 gap-4">
                  <div>
                    <div className="border-b border-[var(--divider)] pb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-secondary)]">
                      Available
                    </div>
                    <div className="mt-2 space-y-1.5 text-[12px] text-[var(--text-primary)]">
                      {hoveredSlot.availableUsers.length > 0 ? (
                        hoveredSlot.availableUsers.map((user) => <div key={user}>{user}</div>)
                      ) : (
                        <div className="text-[var(--text-tertiary)]">No one</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="border-b border-[var(--divider)] pb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
                      Unavailable
                    </div>
                    <div className="mt-2 space-y-1.5 text-[12px] text-[var(--text-tertiary)]">
                      {hoveredSlot.unavailableUsers.length > 0 ? (
                        hoveredSlot.unavailableUsers.map((user) => <div key={user}>{user}</div>)
                      ) : (
                        <div>None</div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-full min-h-[190px] items-center justify-center text-center text-[12px] text-[var(--text-tertiary)]">
                Hover a time slot to see who can make it
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table
              className="table-fixed border-collapse"
              style={{ width: gridWidth }}
            >
              <colgroup>
                <col style={{ width: EVENT_GRID_TIME_COLUMN_PX }} />
                {days.map((day) => (
                  <col key={day.date} style={{ width: EVENT_GRID_DAY_COLUMN_PX }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th />
                  {days.map((day) => {
                    const parts = day.label.split(" ");
                    return (
                      <th
                        key={day.date}
                        className="border-b border-[var(--divider)] px-1 py-1 text-center text-[9px] font-semibold text-[var(--text-tertiary)]"
                      >
                        {parts[0]}
                        <div className="text-[10px] text-[var(--text-primary)]">{parts[2] || parts[1]}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((time, visibleRowIdx) => {
                  const slotIdx = startSlotIdx + visibleRowIdx;
                  const isHour = time.endsWith(":00");
                  return (
                    <tr key={time}>
                      <td
                        className="pr-2 text-right text-[10px] font-medium text-[var(--text-tertiary)]"
                        style={{ width: EVENT_GRID_TIME_COLUMN_PX, height: EVENT_GRID_SLOT_HEIGHT_PX }}
                      >
                        {isHour ? time : ""}
                      </td>
                      {days.map((day, dayIdx) => {
                        const slot = poll.gridSlots.find(
                          (candidate) => candidate.dayIdx === dayIdx && candidate.slotIdx === slotIdx,
                        );
                        return (
                          <td
                            key={`${day.date}-${slotIdx}`}
                            className="border border-black border-[var(--divider)] transition-transform duration-100 hover:scale-y-110"
                            style={{
                              background: getHeatColor(slot?.score || 0),
                              height: EVENT_GRID_SLOT_HEIGHT_PX,
                            }}
                            onMouseEnter={() => setHoveredSlot(slot ?? null)}
                          />
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
