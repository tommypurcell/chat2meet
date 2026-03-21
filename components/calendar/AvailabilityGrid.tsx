import React, { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

const DAYS = ["Mon 24", "Tue 25", "Wed 26", "Thu 27", "Fri 28"] as const;

const TIME_SLOTS: string[] = [];
for (let h = 9; h <= 17; h++) {
  TIME_SLOTS.push(`${h}:00`);
  TIME_SLOTS.push(`${h}:30`);
}

type CellKey = `${number}-${number}`;

// Simulated "other people's" availability (heatmap overlay)
const OTHERS_AVAILABILITY: Record<CellKey, number> = {
  "1-2": 2, "1-3": 3, "1-4": 3, "1-5": 2,
  "2-4": 1, "2-5": 2, "2-6": 2, "2-7": 1,
  "3-6": 2, "3-7": 3, "3-8": 3, "3-9": 2,
  "0-10": 1, "0-11": 2, "0-12": 2,
  "4-2": 2, "4-3": 3, "4-4": 2,
};

const MAX_OTHERS = 3;

interface AvailabilityGridProps {
  timePosition?: "left" | "right";
}

export function AvailabilityGrid({ timePosition = "left" }: AvailabilityGridProps) {
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

  const TimeColumn = ({ time, isHour }: { time: string, isHour: boolean }) => (
    <td
      className={cn(
        "sticky z-10 bg-[var(--bg-primary)] text-[11px] font-medium text-[var(--text-tertiary)]",
        timePosition === "left" ? "left-0 pr-2 text-right" : "right-0 pl-2 text-left",
        isHour ? "pt-1" : "pt-0",
      )}
      style={{ width: 50, height: 28 }}
    >
      {isHour ? time : ""}
    </td>
  );

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
          <span className="text-[10px] text-[var(--text-tertiary)]">Busy</span>
        </div>
        <span className="ml-auto text-[10px] text-[var(--text-tertiary)]">
          MARCH 24–28
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
        <table className="w-full border-collapse" style={{ minWidth: DAYS.length * 50 + 50 }}>
          <thead>
            <tr>
              {timePosition === "left" && <th className="sticky left-0 z-10 w-[50px] bg-[var(--bg-primary)] p-0" />}
              {DAYS.map((day) => (
                <th
                  key={day}
                  className="border-b border-[var(--divider)] px-1 py-1.5 text-center text-[10px] font-semibold text-[var(--text-tertiary)]"
                >
                  {day.split(" ")[0]}
                  <div className="text-[12px] text-[var(--text-primary)]">{day.split(" ")[1]}</div>
                </th>
              ))}
              {timePosition === "right" && <th className="sticky right-0 z-10 w-[50px] bg-[var(--bg-primary)] p-0" />}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((time, slotIdx) => {
              const isHour = time.endsWith(":00");
              return (
                <tr key={time}>
                  {timePosition === "left" && <TimeColumn time={time} isHour={isHour} />}
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
