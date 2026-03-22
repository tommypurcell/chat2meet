"use client";

import { useEffect, useState } from "react";
import { HeatmapSlot } from "@/lib/heatmap-types";

interface AvailabilityHeatmapProps {
  userIds: string[];
  startDate: string; // ISO date
  endDate: string; // ISO date
  durationMinutes: number;
  timezone: string;
}

export function AvailabilityHeatmap({
  userIds,
  startDate,
  endDate,
  durationMinutes,
  timezone,
}: AvailabilityHeatmapProps) {
  const [slots, setSlots] = useState<HeatmapSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userIds.length === 0) {
      setSlots([]);
      setLoading(false);
      return;
    }

    const fetchHeatmap = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/calendar/heatmap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userIds,
            startDate,
            endDate,
            durationMinutes,
            timezone,
            slotIntervalMinutes: 30,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch heatmap");
        }

        const data = await response.json();
        setSlots(data.slots || []);
      } catch (err) {
        console.error("Error fetching heatmap:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchHeatmap();
  }, [userIds, startDate, endDate, durationMinutes, timezone]);

  // Group slots by day
  const slotsByDay = slots.reduce((acc, slot) => {
    if (!acc[slot.day]) {
      acc[slot.day] = [];
    }
    acc[slot.day].push(slot);
    return acc;
  }, {} as Record<string, HeatmapSlot[]>);

  const days = Object.keys(slotsByDay).sort();

  // Get unique time labels (rows)
  const timeLabels = Array.from(
    new Set(slots.map((s) => s.timeLabel))
  ).sort((a, b) => {
    // Sort by time
    const parseTime = (label: string) => {
      const match = label.match(/(\d+):(\d+)\s*(AM|PM)/);
      if (!match) return 0;
      let hour = parseInt(match[1]);
      const minute = parseInt(match[2]);
      const period = match[3];
      if (period === "PM" && hour !== 12) hour += 12;
      if (period === "AM" && hour === 12) hour = 0;
      return hour * 60 + minute;
    };
    return parseTime(a) - parseTime(b);
  });

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <p className="text-sm text-[var(--text-secondary)]">Loading availability...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <p className="text-sm text-red-500">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (userIds.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <div className="mb-3 flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-[var(--bg-tertiary)]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect
                x="3"
                y="4"
                width="18"
                height="18"
                rx="3"
                stroke="currentColor"
                strokeWidth="1.75"
              />
              <path
                d="M3 9h18M8 2v4M16 2v4"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-[var(--text-secondary)]">
            No participants selected
          </p>
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">
            Add people to see group availability
          </p>
        </div>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <p className="text-sm text-[var(--text-secondary)]">No availability data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-auto p-4">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Group Availability
          </h3>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            {userIds.length} participant{userIds.length !== 1 ? "s" : ""} • {durationMinutes} min slots
          </p>
        </div>

        <div className="relative">
          {/* Day labels */}
          <div className="mb-2 flex gap-1">
            <div className="w-16 shrink-0" />
            {days.map((day) => {
              const date = new Date(day);
              const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
              const monthDay = date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });
              return (
                <div
                  key={day}
                  className="flex-1 text-center text-[10px] font-medium text-[var(--text-secondary)]"
                >
                  {dayName}
                  <br />
                  <span className="text-[var(--text-tertiary)]">{monthDay}</span>
                </div>
              );
            })}
          </div>

          {/* Heatmap grid */}
          <div className="space-y-0.5">
            {timeLabels.map((timeLabel) => (
              <div key={timeLabel} className="flex items-center gap-1">
                <div className="w-16 shrink-0 text-right text-[9px] font-medium text-[var(--text-tertiary)] pr-2">
                  {timeLabel}
                </div>
                {days.map((day) => {
                  const slot = slotsByDay[day]?.find((s) => s.timeLabel === timeLabel);

                  if (!slot) {
                    return (
                      <div
                        key={day}
                        className="flex-1 bg-gray-100 dark:bg-gray-800 rounded"
                        style={{ aspectRatio: "1" }}
                      />
                    );
                  }

                  const { score, availableCount, totalCount } = slot;

                  // Color intensity based on score
                  const getColor = (score: number) => {
                    if (score === 1) return "bg-green-600";
                    if (score >= 0.75) return "bg-green-500";
                    if (score >= 0.5) return "bg-yellow-500";
                    if (score >= 0.25) return "bg-orange-400";
                    return "bg-gray-200 dark:bg-gray-700";
                  };

                  return (
                    <div
                      key={day}
                      className="group relative flex-1"
                      style={{ aspectRatio: "1" }}
                    >
                      <div
                        className={`h-full w-full rounded transition-all cursor-pointer hover:ring-2 hover:ring-[var(--accent-primary)] ${getColor(score)}`}
                        title={`${availableCount}/${totalCount} available`}
                      />
                      <div className="absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[10px] text-white group-hover:block dark:bg-gray-100 dark:text-gray-900">
                        {availableCount}/{totalCount} free
                        <br />
                        {timeLabel}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-3 text-[10px]">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-green-600" />
            <span className="text-[var(--text-secondary)]">All free</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-yellow-500" />
            <span className="text-[var(--text-secondary)]">Some free</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-gray-200 dark:bg-gray-700" />
            <span className="text-[var(--text-secondary)]">None free</span>
          </div>
        </div>
      </div>
    </div>
  );
}
