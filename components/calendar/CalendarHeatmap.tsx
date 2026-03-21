"use client";

import { useState, useEffect } from "react";

interface HeatmapStats {
  totalEvents: number;
  daysAnalyzed: number;
  maxBusyCount: number;
  avgBusyCount: number;
  busiestDay: string;
  busiestHour: number;
  busiestCount: number;
}

interface CalendarHeatmapProps {
  userId: string;
  days?: number;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function CalendarHeatmap({ userId, days = 30 }: CalendarHeatmapProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [heatmapData, setHeatmapData] = useState<number[][]>([]);
  const [stats, setStats] = useState<HeatmapStats | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{
    day: number;
    hour: number;
    count: number;
  } | null>(null);

  useEffect(() => {
    fetchHeatmap();
  }, [userId, days]);

  async function fetchHeatmap() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/calendar/google/heatmap?userId=${userId}&days=${days}`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch heatmap");
      }

      setHeatmapData(data.heatmapData);
      setStats(data.stats);
    } catch (err) {
      console.error("Failed to fetch calendar heatmap:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function getColorIntensity(count: number, maxCount: number): string {
    if (count === 0) return "bg-gray-100 dark:bg-gray-800";

    const intensity = count / maxCount;

    if (intensity < 0.2) return "bg-blue-200 dark:bg-blue-900";
    if (intensity < 0.4) return "bg-blue-300 dark:bg-blue-800";
    if (intensity < 0.6) return "bg-blue-400 dark:bg-blue-700";
    if (intensity < 0.8) return "bg-blue-500 dark:bg-blue-600";
    return "bg-blue-600 dark:bg-blue-500";
  }

  function formatHour(hour: number): string {
    if (hour === 0) return "12a";
    if (hour < 12) return `${hour}a`;
    if (hour === 12) return "12p";
    return `${hour - 12}p`;
  }

  if (loading) {
    return (
      <div className="p-6 bg-white dark:bg-gray-900 rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex gap-1">
                {Array.from({ length: 24 }).map((_, j) => (
                  <div
                    key={j}
                    className="h-6 w-full bg-gray-100 dark:bg-gray-800 rounded"
                  ></div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white dark:bg-gray-900 rounded-lg shadow">
        <div className="text-red-600">
          <p className="font-semibold mb-2">Error loading heatmap</p>
          <p className="text-sm">{error}</p>
          <button
            onClick={fetchHeatmap}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Activity Heatmap
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Your calendar activity over the last {stats.daysAnalyzed} days
        </p>
      </div>

      {/* Heatmap Grid */}
      <div className="mb-6 overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Hour labels */}
          <div className="flex mb-1">
            <div className="w-12 shrink-0"></div>
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="flex-1 text-center text-[10px] text-gray-500 dark:text-gray-500 min-w-[20px]"
              >
                {hour % 3 === 0 ? formatHour(hour) : ""}
              </div>
            ))}
          </div>

          {/* Heatmap rows */}
          {DAYS.map((day, dayIndex) => (
            <div key={day} className="flex items-center mb-1">
              <div className="w-12 shrink-0 text-xs font-medium text-gray-700 dark:text-gray-300">
                {day}
              </div>
              <div className="flex-1 flex gap-1">
                {HOURS.map((hour) => {
                  const count = heatmapData[dayIndex]?.[hour] || 0;
                  const colorClass = getColorIntensity(count, stats.maxBusyCount);

                  return (
                    <div
                      key={hour}
                      className={`flex-1 h-6 rounded ${colorClass} transition-all hover:ring-2 hover:ring-blue-400 cursor-pointer min-w-[20px]`}
                      onMouseEnter={() =>
                        setHoveredCell({ day: dayIndex, hour, count })
                      }
                      onMouseLeave={() => setHoveredCell(null)}
                      title={`${day} ${formatHour(hour)}: ${count} event${count !== 1 ? "s" : ""}`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hover tooltip */}
      {hoveredCell && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {DAYS[hoveredCell.day]} at {formatHour(hoveredCell.hour)}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {hoveredCell.count} event{hoveredCell.count !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600 dark:text-gray-400">Less</span>
          <div className="flex gap-1">
            <div className="w-4 h-4 rounded bg-gray-100 dark:bg-gray-800"></div>
            <div className="w-4 h-4 rounded bg-blue-200 dark:bg-blue-900"></div>
            <div className="w-4 h-4 rounded bg-blue-300 dark:bg-blue-800"></div>
            <div className="w-4 h-4 rounded bg-blue-400 dark:bg-blue-700"></div>
            <div className="w-4 h-4 rounded bg-blue-500 dark:bg-blue-600"></div>
            <div className="w-4 h-4 rounded bg-blue-600 dark:bg-blue-500"></div>
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-400">More</span>
        </div>
        <button
          onClick={fetchHeatmap}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
            Total Events
          </p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {stats.totalEvents}
          </p>
        </div>

        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
            Busiest Day
          </p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {stats.busiestDay}
          </p>
        </div>

        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
            Busiest Hour
          </p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {formatHour(stats.busiestHour)}
          </p>
        </div>

        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
            Peak Activity
          </p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {stats.busiestCount}
          </p>
        </div>
      </div>
    </div>
  );
}
