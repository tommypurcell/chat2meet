"use client";

import { CalendarHeatmap } from "./CalendarHeatmap";
import { useAuth } from "@/lib/auth-context";

interface UserCalendarHeatmapProps {
  days?: number;
}

export function UserCalendarHeatmap({ days = 30 }: UserCalendarHeatmapProps) {
  const { user, loading } = useAuth();

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

  if (!user) {
    return (
      <div className="p-6 bg-white dark:bg-gray-900 rounded-lg shadow">
        <p className="text-[var(--text-secondary)] text-center">
          Please sign in to view your calendar activity
        </p>
      </div>
    );
  }

  return <CalendarHeatmap userId={user.uid} days={days} />;
}
