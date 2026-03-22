"use client";

import { CalendarView } from "./CalendarView";
import { useAuth } from "@/lib/auth-context";

interface UserCalendarViewProps {
  view: "month" | "week" | "day";
  onEventClick?: (event: any) => void;
}

export function UserCalendarView({ view, onEventClick }: UserCalendarViewProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[var(--text-tertiary)]">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <p className="text-[var(--text-secondary)] mb-4">
          Please sign in to view your calendar
        </p>
        <a
          href="/login"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Sign In
        </a>
      </div>
    );
  }

  return (
    <CalendarView
      userId={user.uid}
      view={view}
      onEventClick={onEventClick}
    />
  );
}
