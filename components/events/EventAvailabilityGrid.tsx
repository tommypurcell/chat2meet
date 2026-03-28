"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { clearGuestSession, loadGuestSession, saveGuestSession } from "@/lib/guest-session";
import {
  defaultEventTimeSlotLabels,
  EVENT_GRID_DAY_COLUMN_PX,
  EVENT_GRID_SLOT_HEIGHT_PX,
  EVENT_GRID_TIME_COLUMN_PX,
  getVisibleSlotRange,
} from "@/lib/event-grid-slots";

type CellKey = `${number}-${number}`;

const HEADER_SECTION_HEIGHT = 112;

interface EventAvailabilityGridProps {
  eventId: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  /** Event poll window (informational; grid indices still match 9:00–17:00 / parse-availability) */
  earliestTime?: string;
  latestTime?: string;
  timePosition?: "left" | "right";
}

export function EventAvailabilityGrid({
  eventId,
  startDate,
  endDate,
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
  const [guestNameInput, setGuestNameInput] = useState("");
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

  const { startSlotIdx, endSlotIdx } = useMemo(
    () =>
      getVisibleSlotRange({
        earliestTime,
        latestTime,
        padSlots: 4,
      }),
    [earliestTime, latestTime],
  );
  const timeSlots = useMemo(
    () => defaultEventTimeSlotLabels(startSlotIdx, endSlotIdx),
    [startSlotIdx, endSlotIdx],
  );

  // Determine user ID (logged-in account or event-scoped guest identity)
  useEffect(() => {
    if (user?.uid) {
      setCurrentUserId(user.uid);
      setDisplayName(user.displayName || "You");
      return;
    }

    const guestSession = loadGuestSession(eventId);

    if (guestSession) {
      setCurrentUserId(guestSession.guestId);
      setDisplayName(guestSession.name);
      return;
    }

    setCurrentUserId(null);
    setDisplayName("");
  }, [eventId, user]);

  // Fetch initial selected slots for this event
  useEffect(() => {
    if (!currentUserId) {
      setSelected(new Set());
      setHasLoadedInitialAvailability(false);
      return;
    }

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

  const handleGuestStart = useCallback(() => {
    const trimmedName = guestNameInput.trim();
    if (!trimmedName) return;

    const guestId = `guest_${trimmedName.toLowerCase().replace(/\s+/g, "_")}`;
    setCurrentUserId(guestId);
    setDisplayName(trimmedName);
    saveGuestSession({
      eventId,
      guestId,
      name: trimmedName,
      source: "manual",
    });
  }, [eventId, guestNameInput]);

  const handleSwitchIdentity = useCallback(() => {
    clearGuestSession(eventId);
    setCurrentUserId(null);
    setDisplayName("");
    setSelected(new Set());
    setHasLoadedInitialAvailability(false);
    setGuestNameInput("");
  }, [eventId]);

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

  if (!user?.uid && !currentUserId) {
    return (
      <div className="flex h-full flex-col">
        <div
          className="flex shrink-0 flex-col justify-between px-3 pb-3"
          style={{ minHeight: HEADER_SECTION_HEIGHT }}
        >
          <div>
            <div className="text-[13px] font-medium text-[var(--text-primary)]">
              Your Availability
            </div>
            <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
              Enter your name to add availability to this event
            </p>
          </div>
          {earliestTime && latestTime && (
            <span className="text-[10px] text-[var(--text-secondary)]">
              Poll window: {earliestTime}–{latestTime}
            </span>
          )}
        </div>

        <div className="flex flex-1 items-center justify-center px-3 pb-3">
          <div className="w-full max-w-xs rounded-xl border border-[var(--divider)] bg-[var(--bg-secondary)] p-4">
            <label className="mb-2 block text-[11px] font-medium text-[var(--text-secondary)]">
              Your name
            </label>
            <input
              type="text"
              value={guestNameInput}
              onChange={(e) => setGuestNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleGuestStart();
                }
              }}
              placeholder="Enter your name"
              className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--border-focused)]"
            />
            <button
              type="button"
              onClick={handleGuestStart}
              disabled={!guestNameInput.trim()}
              className="mt-3 w-full rounded-lg bg-[var(--accent-primary)] px-3 py-2 text-[13px] font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue as Guest
            </button>
          </div>
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
        {!user?.uid && currentUserId && (
          <button
            type="button"
            onClick={handleSwitchIdentity}
            className="w-fit text-[10px] text-[var(--accent-primary)] transition-opacity hover:opacity-80"
          >
            Not you? Switch guest
          </button>
        )}
        {earliestTime && latestTime && (
          <span className="text-[10px] text-[var(--text-secondary)]">
            Poll window: {earliestTime}–{latestTime}
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
              {timeSlots.map((time, visibleRowIdx) => {
                const slotIdx = startSlotIdx + visibleRowIdx;
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
