import React, { useState, useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const TIME_SLOTS: string[] = [];
for (let h = 8; h <= 20; h++) {
  TIME_SLOTS.push(`${h}:00`);
  TIME_SLOTS.push(`${h}:30`);
}

type CellKey = `${number}-${number}`;

interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
}

interface AvailabilityGridProps {
  timePosition?: "left" | "right";
}

export function AvailabilityGrid({ timePosition = "left" }: AvailabilityGridProps) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<Set<CellKey>>(new Set());
  const [busySlots, setBusySlots] = useState<Set<CellKey>>(new Set());
  const [painting, setPainting] = useState(false);
  const [loading, setLoading] = useState(false);
  const paintModeRef = useRef<boolean>(true); // true = adding, false = removing
  const gridRef = useRef<HTMLDivElement>(null);
  const [isCalendarConnected, setIsCalendarConnected] = useState(true);
  const [calendarUrl, setCalendarUrl] = useState<string | null>(null);

  // Fetch calendar auth URL if needed
  useEffect(() => {
    fetch("/api/calendar/google/auth-url")
      .then((res) => res.json())
      .then((data) => setCalendarUrl(data.url))
      .catch((err) => console.error("Error fetching calendar URL:", err));
  }, []);


  // Fetch initial selected and busy slots
  useEffect(() => {
    if (!user?.uid) return;

    async function fetchData() {
      setLoading(true);
      try {
        // Calculate current week range
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        // Fetch saved availability
        const availRes = await fetch("/api/user/availability");
        const availData = await availRes.json();
        if (availData.success && Array.isArray(availData.slots)) {
          setSelected(new Set(availData.slots as CellKey[]));
        }

        // Fetch Google Calendar events for context
        const timeMin = startOfWeek.toISOString();
        const timeMax = endOfWeek.toISOString();
         const calRes = await fetch(`/api/calendar/google/events?userId=${user?.uid}&timeMin=${timeMin}&timeMax=${timeMax}`);
        const calData = await calRes.json();
        
        if (calData.error === "Calendar not connected") {
          setIsCalendarConnected(false);
        } else if (calData.success && calData.events) {
          setIsCalendarConnected(true);
          const newBusy = new Set<CellKey>();

          calData.events.forEach((event: CalendarEvent) => {
            const start = new Date(event.start);
            const end = new Date(event.end);
            const dayOffset = start.getDay(); 
            if (dayOffset >= 0 && dayOffset < 7) {
              const startHour = start.getHours();
              const startMin = start.getMinutes();
              const endHour = end.getHours();
              const endMin = end.getMinutes();

              TIME_SLOTS.forEach((slot, slotIdx) => {
                const [h, m] = slot.split(":").map(Number);
                const slotTimeInMin = h * 60 + m;
                const startTimeInMin = startHour * 60 + startMin;
                const endTimeInMin = endHour * 60 + endMin;
                if (slotTimeInMin >= startTimeInMin && slotTimeInMin < endTimeInMin) {
                  newBusy.add(`${dayOffset}-${slotIdx}`);
                }
              });
            }
          });
          setBusySlots(newBusy);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user?.uid]);

  // Auto-save whenever "selected" changes after a delay
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (selected.size === 0 && !loading) return; // Wait until initial load

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch("/api/user/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slots: Array.from(selected) }),
        });
      } catch (err) {
        console.error("Failed to save availability:", err);
      }
    }, 1000); // 1s debounce

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [selected, loading]);

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

  const onPointerDown = useCallback((dayIdx: number, slotIdx: number) => {
    const key: CellKey = `${dayIdx}-${slotIdx}`;
    toggleCell(key);
    setPainting(true);
  }, [toggleCell]);

  const onPointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!painting) return;
    const key = getCellFromEvent(e);
    if (key) paintCell(key);
  }, [painting, getCellFromEvent, paintCell]);

  const onPointerUp = useCallback(() => {
    setPainting(false);
  }, []);



  return (
    <div className="flex h-full flex-col">
      {/* Legend */}
      <div className="flex items-center gap-3 px-3 pb-3">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm bg-[var(--accent-primary)]" />
          <span className="text-[10px] text-[var(--text-tertiary)]">Me</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm" style={{ background: "rgba(0,255,163,0.3)" }} />
          <span className="text-[10px] text-[var(--text-tertiary)]">GCal</span>
        </div>
        <span className="ml-auto text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">
          {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </span>
      </div>

      {/* Grid */}
      <div
        ref={gridRef}
        className="flex-1 overflow-auto select-none custom-scrollbar"
        onMouseMove={onPointerMove}
        onMouseUp={onPointerUp}
        onMouseLeave={onPointerUp}
        onTouchMove={onPointerMove}
        onTouchEnd={onPointerUp}
      >
        <table className="w-full border-collapse" style={{ minWidth: 7 * 50 + 60 }}>
          <thead>
            <tr className="sticky top-0 z-30 bg-[var(--bg-primary)]/80 backdrop-blur-md">
              {timePosition === "left" && <th className="sticky left-0 z-40 w-[60px] bg-[var(--bg-primary)] border-b border-[var(--divider)]/50 p-0" />}
              {Array.from({ length: 7 }).map((_, i) => {
                const now = new Date();
                const d = new Date(now);
                d.setDate(now.getDate() - now.getDay() + i);
                const dayName = WEEK_DAYS[d.getDay()];
                const dayNum = d.getDate();
                const today = d.getDate() === now.getDate() && d.getMonth() === now.getMonth();
                
                return (
                  <th
                    key={i}
                    className={cn(
                      "border-b border-[var(--divider)]/50 px-1 py-2 text-center transition-colors",
                      today && "bg-[var(--accent-primary)]/5"
                    )}
                  >
                    <div className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">{dayName}</div>
                    <div className={cn(
                      "mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold mt-0.5",
                      today ? "bg-[var(--accent-primary)] text-white shadow-[0_0_10px_rgba(0,255,163,0.3)]" : "text-[var(--text-primary)]"
                    )}>{dayNum}</div>
                  </th>
                );
              })}
              {timePosition === "right" && <th className="sticky right-0 z-40 w-[60px] bg-[var(--bg-primary)] border-b border-[var(--divider)]/50 p-0" />}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((time, slotIdx) => {
              const isHour = time.endsWith(":00");
              return (
                <tr key={time} className="group">
                  {timePosition === "left" && (
                    <td className="sticky left-0 z-20 bg-[var(--bg-primary)]/90 text-[10px] font-semibold text-[var(--text-tertiary)] text-right pr-3 pt-1 border-r border-[var(--divider)]/20" style={{ width: 60, height: 28 }}>
                      {isHour ? time : ""}
                    </td>
                  )}
                  {[0, 1, 2, 3, 4, 5, 6].map((dayIdx) => {
                    const key: CellKey = `${dayIdx}-${slotIdx}`;

                    const isSelected = selected.has(key);
                    const isBusy = busySlots.has(key);
                    
                    return (
                      <td
                        key={key}
                        data-cell={key}
                        className={cn(
                          "cursor-pointer border-r border-[var(--divider)]/20 transition-all duration-75 relative",
                          isHour ? "border-t border-t-[var(--divider)]/40" : "border-t border-t-[var(--divider)]/10",
                          isSelected && "z-10"
                        )}
                        style={{
                          background: isSelected ? "var(--accent-primary)" : isBusy ? "rgba(0,255,163,0.15)" : "transparent",
                          height: 28,
                          boxShadow: isSelected ? "0 0 15px rgba(0, 255, 163, 0.4), inset 0 0 0 1px rgba(255,255,255,0.2)" : "none",
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          onPointerDown(dayIdx, slotIdx);
                        }}
                        onTouchStart={(e) => {
                          e.preventDefault();
                          onPointerDown(dayIdx, slotIdx);
                        }}
                      >
                        {isSelected && isBusy && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-30">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-white">
                              <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        )}
                      </td>
                    );
                  })}
                  {timePosition === "right" && (
                    <td className="sticky right-0 z-20 bg-[var(--bg-primary)]/90 text-[10px] font-semibold text-[var(--text-tertiary)] text-left pl-3 pt-1 border-l border-[var(--divider)]/20" style={{ width: 60, height: 28 }}>
                      {isHour ? time : ""}
                    </td>
                  )}
                </tr>
              );
             })}
          </tbody>
        </table>

        {!isCalendarConnected && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--bg-primary)]/40 px-6 backdrop-blur-[2px]">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-sheet)] p-6 text-center shadow-[var(--shadow-elevated)] max-w-[280px]">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bubble-action)] text-[var(--accent-primary)]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2" />
                  <path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">Calendar not connected</p>
              <p className="text-[10px] text-[var(--text-tertiary)] mb-4">
                Connect your Google Calendar to see your real busy times here.
              </p>
              {calendarUrl ? (
                <a href={calendarUrl}>
                  <button className="w-full rounded-lg bg-[var(--accent-primary)] py-2 text-[11px] font-semibold text-white hover:opacity-90 transition-opacity">
                    Connect Now
                  </button>
                </a>
              ) : (
                <div className="text-[10px] text-[var(--text-tertiary)]">Loading...</div>
              )}
            </div>
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
