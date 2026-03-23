"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { loadGuestSession, saveGuestSession } from "@/lib/guest-session";
import {
  defaultEventTimeSlotLabels,
  EVENT_GRID_DAY_COLUMN_PX,
  EVENT_GRID_SLOT_HEIGHT_PX,
  EVENT_GRID_TIME_COLUMN_PX,
} from "@/lib/event-grid-slots";

type CellKey = `${number}-${number}`;

const HEADER_SECTION_HEIGHT = 112;

interface EventAvailabilityGridProps {
  eventId: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  creatorId?: string; // Pre-filled creator ID (for guest events)
  creatorName?: string; // Creator's display name
  /** Event poll window (informational; grid indices still match 9:00–17:00 / parse-availability) */
  earliestTime?: string;
  latestTime?: string;
  timePosition?: "left" | "right";
}

export function EventAvailabilityGrid({
  eventId,
  startDate,
  endDate,
  creatorId,
  creatorName,
  earliestTime,
  latestTime,
  timePosition = "left",
}: EventAvailabilityGridProps) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<Set<CellKey>>(new Set());
  const [painting, setPainting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasLoadedInitialAvailability, setHasLoadedInitialAvailability] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const paintModeRef = useRef<boolean>(true);
  const gridRef = useRef<HTMLDivElement>(null);

  // Generate day columns from date range
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

  // Determine user ID (either logged in user, provided creator, or guest prompt)
  useEffect(() => {
    if (user?.uid) {
      setCurrentUserId(user.uid);
      setDisplayName(user.displayName || "You");
      return;
    }

    const guestSession = loadGuestSession();
    const guestSessionMatchesEvent =
      guestSession &&
      (guestSession.lastEventId === eventId ||
        (creatorId ? guestSession.guestId === creatorId : false));

    if (guestSession && guestSessionMatchesEvent) {
      setCurrentUserId(guestSession.guestId);
      setDisplayName(guestSession.name);
      return;
    }

    if (creatorId && creatorName) {
      // Use provided creator ID (for when viewing your own event as guest creator)
      setCurrentUserId(creatorId);
      setDisplayName(creatorName);
    } else {
      // For other guest users, prompt for their name
      const guestName = prompt("Please enter your name to add your availability:");
      if (guestName) {
        const guestId = `guest_${guestName.toLowerCase().replace(/\s+/g, '_')}`;
        setCurrentUserId(guestId);
        setDisplayName(guestName);
        saveGuestSession({
          guestId,
          name: guestName,
          source: "agent",
          lastEventId: eventId,
        });
      }
    }
  }, [user, creatorId, creatorName, eventId]);

  // Fetch initial selected slots for this event
  useEffect(() => {
    if (!currentUserId) return;

    setHasLoadedInitialAvailability(false);

    async function fetchAvailability() {
      if (!currentUserId) return;

      setLoading(true);
      try {
        const res = await fetch(`/api/events/${eventId}/availability?userId=${currentUserId}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.slots)) {
          setSelected(new Set(data.slots as CellKey[]));
        }
      } catch (err) {
        console.error("Failed to fetch availability:", err);
      } finally {
        setLoading(false);
        setHasLoadedInitialAvailability(true);
      }
    }

    fetchAvailability();
  }, [eventId, currentUserId]);

  // Auto-save whenever selected changes
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (loading || !currentUserId || !hasLoadedInitialAvailability) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      if (!currentUserId) return;

      try {
        await fetch(`/api/events/${eventId}/availability`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUserId,
            slots: Array.from(selected),
          }),
        });
      } catch (err) {
        console.error("Failed to save availability:", err);
      }
    }, 500); // 500ms debounce

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [selected, loading, eventId, currentUserId, hasLoadedInitialAvailability]);

  const toggleCell = useCallback((key: CellKey) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        paintModeRef.current = false;
      } else {
        next.add(key);
        paintModeRef.current = true;
      }
      return next;
    });
  }, []);

  const paintCell = useCallback((key: CellKey) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (paintModeRef.current) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  }, []);

  const getCellFromEvent = useCallback((e: React.MouseEvent | React.TouchEvent): CellKey | null => {
    const grid = gridRef.current;
    if (!grid) return null;
    let clientX: number, clientY: number;
    if ("touches" in e) {
      const touch = e.touches[0];
      if (!touch) return null;
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const el = document.elementFromPoint(clientX, clientY);
    if (!el) return null;
    const cellKey = el.getAttribute("data-cell");
    return cellKey as CellKey | null;
  }, []);

  const onPointerDown = useCallback(
    (dayIdx: number, slotIdx: number) => {
      const key: CellKey = `${dayIdx}-${slotIdx}`;
      toggleCell(key);
      setPainting(true);
    },
    [toggleCell]
  );

  const onPointerMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!painting) return;
      const key = getCellFromEvent(e);
      if (key) paintCell(key);
    },
    [painting, getCellFromEvent, paintCell]
  );

  const onPointerUp = useCallback(() => {
    setPainting(false);
  }, []);

  const TimeColumn = ({ time, isHour }: { time: string; isHour: boolean }) => (
    <td
      className={cn(
        "sticky z-10 bg-[var(--bg-tertiary)] pr-2 text-right text-[11px] font-medium text-[var(--text-tertiary)]",
        timePosition === "left" ? "left-0 pr-2 text-right" : "right-0 pl-2 text-left",
        isHour ? "pt-1" : "pt-0"
      )}
      style={{ width: EVENT_GRID_TIME_COLUMN_PX, height: EVENT_GRID_SLOT_HEIGHT_PX }}
    >
      {isHour ? time : ""}
    </td>
  );

  return (
    <div className="flex h-full flex-col">
      <div
        className="flex shrink-0 flex-col justify-between px-3 pb-3"
        style={{ minHeight: HEADER_SECTION_HEIGHT }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[13px] font-medium text-[var(--text-primary)]">
              {displayName || "Your"} Availability
            </div>
            <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
              Click and drag to paint your free time
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-[var(--text-tertiary)]">
            <span>Unavailable</span>
            <div className="h-3 w-6 rounded-sm border border-[var(--divider)] bg-transparent" />
            <span>Available</span>
            <div className="h-3 w-6 rounded-sm bg-[var(--accent-primary)]" />
          </div>
        </div>
        {loading && (
          <span className="text-[10px] text-[var(--text-tertiary)]">Syncing...</span>
        )}
        {!loading && (
          <span className="text-[10px] text-[var(--text-tertiary)]">Saved immediately</span>
        )}
        {earliestTime && latestTime && (
          <span className="text-[10px] text-[var(--text-secondary)]">
            Poll window: {earliestTime}–{latestTime} (full grid 9:00–17:00)
          </span>
        )}
      </div>

      <div
        ref={gridRef}
        className="custom-scrollbar min-h-0 w-full flex-1 select-none overflow-auto px-3 pb-3"
        onMouseMove={onPointerMove}
        onMouseUp={onPointerUp}
        onMouseLeave={onPointerUp}
        onTouchMove={onPointerMove}
        onTouchEnd={onPointerUp}
      >
        <table
          className="table-fixed border-collapse"
          style={{
            width:
              (timePosition === "left" ? EVENT_GRID_TIME_COLUMN_PX : 0) +
              days.length * EVENT_GRID_DAY_COLUMN_PX +
              (timePosition === "right" ? EVENT_GRID_TIME_COLUMN_PX : 0),
          }}
        >
          <colgroup>
            {timePosition === "left" && (
              <col style={{ width: EVENT_GRID_TIME_COLUMN_PX }} />
            )}
            {days.map((day) => (
              <col key={day.date} style={{ width: EVENT_GRID_DAY_COLUMN_PX }} />
            ))}
            {timePosition === "right" && (
              <col style={{ width: EVENT_GRID_TIME_COLUMN_PX }} />
            )}
          </colgroup>
            <thead>
              <tr>
                {timePosition === "left" && (
                  <th
                    className="sticky left-0 z-10 bg-[var(--bg-tertiary)] p-0"
                    style={{ width: EVENT_GRID_TIME_COLUMN_PX }}
                  />
                )}
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
                {timePosition === "right" && (
                  <th
                    className="sticky right-0 z-10 bg-[var(--bg-tertiary)] p-0"
                    style={{ width: EVENT_GRID_TIME_COLUMN_PX }}
                  />
                )}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((time, slotIdx) => {
                const isHour = time.endsWith(":00");
                return (
                  <tr key={time}>
                    {timePosition === "left" && <TimeColumn time={time} isHour={isHour} />}
                    {days.map((day, dayIdx) => {
                      const key: CellKey = `${dayIdx}-${slotIdx}`;
                      const isSelected = selected.has(key);
                      return (
                        <td
                          key={key}
                          data-cell={key}
                          className={cn(
                            "cursor-pointer border-r border-[var(--divider)] transition-colors duration-75",
                            dayIdx === 0 && "border-l border-l-[var(--divider)]",
                            isHour
                              ? "border-t border-t-[var(--divider)]"
                              : "border-t border-t-[var(--divider)]/30"
                          )}
                          style={{
                            background: isSelected ? "var(--accent-primary)" : "transparent",
                            height: EVENT_GRID_SLOT_HEIGHT_PX,
                            boxShadow: isSelected
                              ? "inset 0 0 0 1px var(--accent-primary)"
                              : "none",
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            onPointerDown(dayIdx, slotIdx);
                          }}
                          onTouchStart={(e) => {
                            e.preventDefault();
                            onPointerDown(dayIdx, slotIdx);
                          }}
                        />
                      );
                    })}
                    {timePosition === "right" && <TimeColumn time={time} isHour={isHour} />}
                  </tr>
                );
              })}
            </tbody>
          </table>
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
