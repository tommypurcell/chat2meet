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

  function getHeatmapStyle(count: number, maxCount: number): React.CSSProperties {
    if (count === 0) return { background: 'var(--bg-tertiary)' };

    const intensity = count / maxCount;
    const opacity = 0.2 + intensity * 0.8; // range 0.2 to 1.0

    return { background: `color-mix(in srgb, var(--accent-primary) ${Math.round(opacity * 100)}%, transparent)` };
  }

  function formatHour(hour: number): string {
    if (hour === 0) return "12a";
    if (hour < 12) return `${hour}a`;
    if (hour === 12) return "12p";
    return `${hour - 12}p`;
  }

  if (loading) {
    return (
      <div className="p-6 bg-[var(--bg-primary)] rounded-lg" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="animate-pulse">
          <div className="h-4 bg-[var(--bg-tertiary)] rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex gap-1">
                {Array.from({ length: 24 }).map((_, j) => (
                  <div
                    key={j}
                    className="h-6 w-full bg-[var(--bg-tertiary)] rounded"
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
      <div className="p-6 bg-[var(--bg-primary)] rounded-lg" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="text-[var(--accent-danger)]">
          <p className="font-semibold mb-2">Error loading heatmap</p>
          <p className="text-sm">{error}</p>
          <button
            onClick={fetchHeatmap}
            className="mt-4 px-4 py-2 bg-[var(--accent-primary)] text-[var(--bubble-sender-text)] rounded hover:opacity-90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="bg-[var(--bg-primary)] rounded-lg p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
          Activity Heatmap
        </h3>
        <p className="text-sm text-[var(--text-tertiary)]">
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
                className="flex-1 text-center text-[10px] text-[var(--text-tertiary)] min-w-[20px]"
              >
                {hour % 3 === 0 ? formatHour(hour) : ""}
              </div>
            ))}
          </div>

          {/* Heatmap rows */}
          {DAYS.map((day, dayIndex) => (
            <div key={day} className="flex items-center mb-1">
              <div className="w-12 shrink-0 text-xs font-medium text-[var(--text-secondary)]">
                {day}
              </div>
              <div className="flex-1 flex gap-1">
                {HOURS.map((hour) => {
                  const count = heatmapData[dayIndex]?.[hour] || 0;
                  const cellStyle = getHeatmapStyle(count, stats.maxBusyCount);

                  return (
                    <div
                      key={hour}
                      className="flex-1 h-6 rounded transition-all hover:ring-2 hover:ring-[var(--border-focused)] cursor-pointer min-w-[20px]"
                      style={cellStyle}
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
        <div className="mb-4 p-3 bg-[var(--bubble-action)] rounded-lg border border-[var(--bubble-action-border)]">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {DAYS[hoveredCell.day]} at {formatHour(hoveredCell.hour)}
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">
            {hoveredCell.count} event{hoveredCell.count !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-tertiary)]">Less</span>
          <div className="flex gap-1">
            <div className="w-4 h-4 rounded bg-[var(--bg-tertiary)]"></div>
            <div className="w-4 h-4 rounded" style={{ background: 'color-mix(in srgb, var(--accent-primary) 20%, transparent)' }}></div>
            <div className="w-4 h-4 rounded" style={{ background: 'color-mix(in srgb, var(--accent-primary) 40%, transparent)' }}></div>
            <div className="w-4 h-4 rounded" style={{ background: 'color-mix(in srgb, var(--accent-primary) 60%, transparent)' }}></div>
            <div className="w-4 h-4 rounded" style={{ background: 'color-mix(in srgb, var(--accent-primary) 80%, transparent)' }}></div>
            <div className="w-4 h-4 rounded bg-[var(--accent-primary)]"></div>
          </div>
          <span className="text-xs text-[var(--text-tertiary)]">More</span>
        </div>
        <button
          onClick={fetchHeatmap}
          className="text-xs text-[var(--text-link)] hover:underline"
        >
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3 bg-[var(--bg-secondary)] rounded-lg">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">
            Total Events
          </p>
          <p className="text-xl font-bold text-[var(--text-primary)]">
            {stats.totalEvents}
          </p>
        </div>

        <div className="p-3 bg-[var(--bg-secondary)] rounded-lg">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">
            Busiest Day
          </p>
          <p className="text-xl font-bold text-[var(--text-primary)]">
            {stats.busiestDay}
          </p>
        </div>

        <div className="p-3 bg-[var(--bg-secondary)] rounded-lg">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">
            Busiest Hour
          </p>
          <p className="text-xl font-bold text-[var(--text-primary)]">
            {formatHour(stats.busiestHour)}
          </p>
        </div>

        <div className="p-3 bg-[var(--bg-secondary)] rounded-lg">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">
            Peak Activity
          </p>
          <p className="text-xl font-bold text-[var(--text-primary)]">
            {stats.busiestCount}
          </p>
        </div>
      </div>
    </div>
  );
}
