import React, { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { MOCK_CALENDAR_EVENTS } from "@/lib/data";

const DAYS_DATES = [
  "2026-03-16",
  "2026-03-17",
  "2026-03-18",
  "2026-03-19",
  "2026-03-20"
];
const DAYS = ["Mon 16", "Tue 17", "Wed 18", "Thu 19", "Fri 20"] as const;

const TIME_SLOTS: string[] = [];
for (let h = 9; h <= 17; h++) {
  TIME_SLOTS.push(`${h}:00`);
  TIME_SLOTS.push(`${h}:30`);
}

type CellKey = `${number}-${number}`;

const generateAvailability = (): Record<CellKey, number> => {
  const availability: Record<CellKey, number> = {};
  const totalUsers = Object.keys(MOCK_CALENDAR_EVENTS).length;
  
  // Initialize all slots to max free (everyone available)
  for (let dayIdx = 0; dayIdx < DAYS_DATES.length; dayIdx++) {
    for (let slotIdx = 0; slotIdx < TIME_SLOTS.length; slotIdx++) {
      availability[`${dayIdx}-${slotIdx}`] = totalUsers;
    }
  }

  // Subtract availability for busy blocks
  Object.values(MOCK_CALENDAR_EVENTS).forEach(userEvents => {
    userEvents.forEach(event => {
      const startMs = new Date(event.start).getTime();
      const endMs = new Date(event.end).getTime();
      
      DAYS_DATES.forEach((dateStr, dayIdx) => {
        TIME_SLOTS.forEach((time, slotIdx) => {
          const [hStr, mStr] = time.split(":");
          const slotTimeStr = `${dateStr}T${hStr.padStart(2, "0")}:${mStr.padStart(2, "0")}:00-07:00`;
          const slotMs = new Date(slotTimeStr).getTime();
          
          if (slotMs >= startMs && slotMs < endMs) {
            availability[`${dayIdx}-${slotIdx}`]--;
          }
        });
      });
    });
  });
  
  return availability;
};

const OTHERS_AVAILABILITY = generateAvailability();
const MAX_OTHERS = Object.keys(MOCK_CALENDAR_EVENTS).length;

export function AvailabilityGrid() {
  const [selected, setSelected] = useState<Set<CellKey>>(new Set());
  const [painting, setPainting] = useState(false);
  const paintModeRef = useRef<boolean>(true); // true = adding, false = removing
  const gridRef = useRef<HTMLDivElement>(null);

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

  function getHeatColor(dayIdx: number, slotIdx: number): string {
    const key: CellKey = `${dayIdx}-${slotIdx}`;
    const isSelected = selected.has(key);
    const othersCount = OTHERS_AVAILABILITY[key] || 0;

    if (isSelected && othersCount > 0) {
      // Overlap — bright accent
      const intensity = Math.min(othersCount / MAX_OTHERS, 1);
      const alpha = 0.4 + intensity * 0.6;
      return `rgba(0, 255, 163, ${alpha})`;
    }
    if (isSelected) {
      // Only you
      return "var(--accent-primary)";
    }
    if (othersCount > 0) {
      // Others only
      const intensity = Math.min(othersCount / MAX_OTHERS, 1);
      const alpha = 0.08 + intensity * 0.2;
      return `rgba(0, 255, 163, ${alpha})`;
    }
    return "transparent";
  }

  return (
    <div className="flex h-full flex-col">
      {/* Legend */}
      <div className="flex items-center gap-4 px-4 pb-3">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-[var(--accent-primary)]" />
          <span className="text-[11px] text-[var(--text-tertiary)]">You</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm" style={{ background: "rgba(0,255,163,0.2)" }} />
          <span className="text-[11px] text-[var(--text-tertiary)]">Others</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm" style={{ background: "rgba(0,255,163,0.8)" }} />
          <span className="text-[11px] text-[var(--text-tertiary)]">Overlap</span>
        </div>
        <span className="ml-auto text-[11px] text-[var(--text-tertiary)]">
          {selected.size} slots selected
        </span>
      </div>

      {/* Grid */}
      <div
        ref={gridRef}
        className="flex-1 overflow-auto select-none"
        onMouseMove={onPointerMove}
        onMouseUp={onPointerUp}
        onMouseLeave={onPointerUp}
        onTouchMove={onPointerMove}
        onTouchEnd={onPointerUp}
      >
        <table className="w-full border-collapse" style={{ minWidth: DAYS.length * 80 + 60 }}>
          <thead>
            <tr>
              <th className="sticky left-0 z-10 w-[60px] bg-[var(--bg-primary)] p-0" />
              {DAYS.map((day) => (
                <th
                  key={day}
                  className="border-b border-[var(--divider)] px-1 py-2 text-center text-xs font-semibold text-[var(--text-secondary)]"
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((time, slotIdx) => {
              const isHour = time.endsWith(":00");
              return (
                <tr key={time}>
                  <td
                    className={cn(
                      "sticky left-0 z-10 bg-[var(--bg-primary)] pr-2 text-right text-[11px] font-medium text-[var(--text-tertiary)]",
                      isHour ? "pt-1" : "pt-0",
                    )}
                    style={{ width: 60, height: 28 }}
                  >
                    {isHour ? time : ""}
                  </td>
                  {DAYS.map((_, dayIdx) => {
                    const key: CellKey = `${dayIdx}-${slotIdx}`;
                    const bg = getHeatColor(dayIdx, slotIdx);
                    const isSelected = selected.has(key);
                    return (
                      <td
                        key={key}
                        data-cell={key}
                        className={cn(
                          "cursor-pointer border-r border-[var(--divider)] transition-colors duration-75",
                          isHour
                            ? "border-t border-t-[var(--divider)]"
                            : "border-t border-t-[var(--divider)]/30",
                        )}
                        style={{
                          background: bg,
                          height: 28,
                          boxShadow: isSelected ? "inset 0 0 0 1px var(--accent-primary)" : "none",
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
