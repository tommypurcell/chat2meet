"use client";

import { useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  defaultEventTimeSlotLabels,
  EVENT_GRID_DAY_COLUMN_PX,
  EVENT_GRID_SLOT_HEIGHT_PX,
  EVENT_GRID_TIME_COLUMN_PX,
} from "@/lib/event-grid-slots";

const HEADER_SECTION_HEIGHT = 112;

interface SlotDetail {
  dayIdx: number;
  slotIdx: number;
  time: string;
  availableUsers: string[];
  unavailableUsers: string[];
  score: number;
}

interface EventGroupHeatmapProps {
  eventId: string;
  startDate: string;
  endDate: string;
  participantIds: string[];
  /** Event poll window (informational; grid indices still match 9:00–17:00) */
  earliestTime?: string;
  latestTime?: string;
}

export function EventGroupHeatmap({
  eventId,
  startDate,
  endDate,
  participantIds,
  earliestTime,
  latestTime,
}: EventGroupHeatmapProps) {
  const [slots, setSlots] = useState<SlotDetail[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hoveredSlot, setHoveredSlot] = useState<SlotDetail | null>(null);
  const participantKey = useMemo(() => participantIds.join(","), [participantIds]);
  const currentParticipantIds = useMemo(
    () => (participantKey ? participantKey.split(",") : []),
    [participantKey]
  );

  // Generate day columns
  const days = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const result: { label: string; date: string; dayOfWeek: string }[] = [];

    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.toLocaleDateString("en-US", { weekday: "short" });
      const monthDay = current.getDate();
      result.push({
        label: `${dayOfWeek} ${monthDay}`,
        date: current.toISOString().split("T")[0],
        dayOfWeek,
      });
      current.setDate(current.getDate() + 1);
    }

    return result;
  }, [startDate, endDate]);

  const timeSlots = useMemo(() => defaultEventTimeSlotLabels(), []);

  useEffect(() => {
    if (currentParticipantIds.length === 0) {
      setSlots([]);
      setInitialLoading(false);
      setRefreshing(false);
      return;
    }

    let cancelled = false;

    const fetchGroupAvailability = async (mode: "initial" | "refresh") => {
      if (mode === "initial") {
        setInitialLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const res = await fetch(`/api/events/${eventId}/group-availability`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ participantIds: currentParticipantIds }),
        });

        if (!res.ok) {
          throw new Error("Failed to fetch group availability");
        }

        const data = await res.json();
        if (!cancelled) {
          setSlots(data.slots || []);
        }
      } catch (err) {
        console.error("Error fetching group availability:", err);
      } finally {
        if (!cancelled) {
          setInitialLoading(false);
          setRefreshing(false);
        }
      }
    };

    void fetchGroupAvailability("initial");

    // Poll for updates every 5 seconds
    const interval = setInterval(() => {
      void fetchGroupAvailability("refresh");
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [currentParticipantIds, eventId]);

  const getSlot = (dayIdx: number, slotIdx: number): SlotDetail | null => {
    return slots.find((s) => s.dayIdx === dayIdx && s.slotIdx === slotIdx) || null;
  };

  const getHeatColor = (score: number): string => {
    if (score === 0) return "var(--bg-calendar-cell)";
    if (score === 1) return "var(--accent-primary)";

    // Gradient between transparent and accent-primary
    const opacity = 0.15 + score * 0.85;
    return `color-mix(in srgb, var(--accent-primary) ${opacity * 100}%, transparent)`;
  };

  if (initialLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[13px] text-[var(--text-secondary)]">Loading group availability...</p>
      </div>
    );
  }

  if (participantIds.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--bg-tertiary)]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" fill="var(--text-tertiary)" />
              <circle cx="6" cy="12" r="2" fill="var(--text-tertiary)" opacity="0.6" />
              <circle cx="18" cy="12" r="2" fill="var(--text-tertiary)" opacity="0.6" />
            </svg>
          </div>
          <p className="text-[13px] font-medium text-[var(--text-secondary)]">
            No participants yet
          </p>
          <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
            Share this event to see group availability
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div
        className="flex shrink-0 flex-col justify-between px-3 pb-3"
        style={{ minHeight: HEADER_SECTION_HEIGHT }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[13px] font-medium text-[var(--text-primary)]">
              Group Availability
            </div>
            <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
              Hover a slot to see who can make it
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-[var(--text-tertiary)]">
            <span>0/{participantIds.length}</span>
            <div className="h-3 w-6 rounded-sm border border-[var(--divider)] bg-transparent" />
            <span>Some</span>
            <div
              className="h-3 w-6 rounded-sm"
              style={{ background: getHeatColor(0.5) }}
            />
            <span>{participantIds.length}/{participantIds.length}</span>
            <div className="h-3 w-6 rounded-sm bg-[var(--accent-primary)]" />
          </div>
        </div>
        <span className="text-[10px] text-[var(--text-tertiary)]">
          Darker green means more overlap
        </span>
        {refreshing && (
          <span className="text-[10px] text-[var(--text-tertiary)]">
            Refreshing…
          </span>
        )}
        {earliestTime && latestTime && (
          <span className="text-[10px] text-[var(--text-secondary)]">
            Poll window: {earliestTime}–{latestTime} (full grid 9:00–17:00)
          </span>
        )}
      </div>

      <div className="custom-scrollbar min-h-0 w-full flex-1 overflow-auto px-3 pb-3">
        <table
          className="table-fixed border-collapse"
          style={{
            width: EVENT_GRID_TIME_COLUMN_PX + days.length * EVENT_GRID_DAY_COLUMN_PX,
          }}
        >
          <colgroup>
            <col style={{ width: EVENT_GRID_TIME_COLUMN_PX }} />
            {days.map((day) => (
              <col key={day.date} style={{ width: EVENT_GRID_DAY_COLUMN_PX }} />
            ))}
          </colgroup>
            <thead>
              <tr>
                <th
                  className="sticky left-0 z-10 bg-[var(--bg-tertiary)] p-0"
                  style={{ width: EVENT_GRID_TIME_COLUMN_PX }}
                />
                {days.map((day) => (
                  <th
                    key={day.date}
                    className="border-b border-[var(--divider)] px-1 py-1.5 text-center text-[10px] font-semibold text-[var(--text-tertiary)]"
                  >
                    {day.dayOfWeek}
                    <div className="text-[12px] text-[var(--text-primary)]">
                      {day.label.split(" ")[1]}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((time, slotIdx) => {
                const isHour = time.endsWith(":00");
                return (
                  <tr key={time}>
                    <td
                      className="sticky left-0 z-10 bg-[var(--bg-tertiary)] pr-2 text-right text-[11px] font-medium text-[var(--text-tertiary)]"
                      style={{ width: EVENT_GRID_TIME_COLUMN_PX, height: EVENT_GRID_SLOT_HEIGHT_PX }}
                    >
                      {isHour ? time : ""}
                    </td>
                    {days.map((day, dayIdx) => {
                      const slot = getSlot(dayIdx, slotIdx);
                      const score = slot?.score || 0;
                      const bg = getHeatColor(score);

                      return (
                        <td
                          key={`${dayIdx}-${slotIdx}`}
                          className={cn(
                            "relative border-r border-[var(--divider)] transition-all duration-150",
                            dayIdx === 0 && "border-l border-l-[var(--divider)]",
                            isHour
                              ? "border-t border-t-[var(--divider)]"
                              : "border-t border-t-[var(--divider)]/30"
                          )}
                          style={{
                            background: bg,
                            height: EVENT_GRID_SLOT_HEIGHT_PX,
                          }}
                          onMouseEnter={() => slot && setHoveredSlot(slot)}
                          onMouseLeave={() => setHoveredSlot(null)}
                        />
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>

        {/* Tooltip */}
        {hoveredSlot && (
          <div
            className="pointer-events-none fixed z-50 rounded-lg border border-[var(--border)] bg-[var(--bg-sheet)] px-3 py-2 shadow-[var(--shadow-elevated)] backdrop-blur-xl"
            style={{
              left: "50%",
              top: "20%",
              transform: "translateX(-50%)",
            }}
          >
            <div className="mb-1 text-[11px] font-semibold text-[var(--text-primary)]">
              {hoveredSlot.time}
            </div>

            {hoveredSlot.availableUsers.length > 0 && (
              <div className="mb-1">
                <div className="text-[10px] font-medium text-[var(--text-secondary)]">
                  Available ({hoveredSlot.availableUsers.length})
                </div>
                <div className="text-[11px] text-[var(--text-primary)]">
                  {hoveredSlot.availableUsers.join(", ")}
                </div>
              </div>
            )}

            {hoveredSlot.unavailableUsers.length > 0 && (
              <div>
                <div className="text-[10px] font-medium text-[var(--text-tertiary)]">
                  Unavailable ({hoveredSlot.unavailableUsers.length})
                </div>
                <div className="text-[11px] text-[var(--text-tertiary)]">
                  {hoveredSlot.unavailableUsers.join(", ")}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--divider);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
