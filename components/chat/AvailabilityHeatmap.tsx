"use client";

import { useMemo } from "react";
import {
  extractSuggestedTimesFromMessages,
  parseSuggestedSlotDate,
} from "@/lib/chat-tool-outputs";

interface TimeSlot {
  day: string;
  hour: number;
  available: boolean;
  participants: string[];
}

interface AvailabilityHeatmapProps {
  messages: unknown[];
  schedulingParticipants?: Array<{
    memberUserId: string;
    memberName: string;
    memberEmail: string;
  }>;
}

function parseHour12(timeStr: string): number | null {
  const m = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const ap = m[3].toUpperCase();
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return h;
}

export function AvailabilityHeatmap({
  messages,
  schedulingParticipants = [],
}: AvailabilityHeatmapProps) {
  const suggestedTimes = useMemo(
    () => extractSuggestedTimesFromMessages(messages),
    [messages],
  );

  const grid = useMemo(() => {
    const now = new Date();
    const nextWeek: TimeSlot[][] = [];

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date(now);
      date.setDate(now.getDate() + dayOffset);
      date.setHours(0, 0, 0, 0);

      const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
      const monthDay = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const dayLabel = `${dayName}, ${monthDay}`;

      const daySlots: TimeSlot[] = [];
      for (let hour = 5; hour < 23; hour++) {
        daySlots.push({
          day: dayLabel,
          hour,
          available: false,
          participants: [],
        });
      }
      nextWeek.push(daySlots);
    }

    const names =
      schedulingParticipants.length > 0
        ? schedulingParticipants.map((p) => p.memberName)
        : [];

    suggestedTimes.forEach((slot) => {
      const slotDate = parseSuggestedSlotDate(slot.date, now);
      const hour = parseHour12(slot.time);
      if (slotDate == null || hour == null) return;

      slotDate.setHours(0, 0, 0, 0);

      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const colDate = new Date(now);
        colDate.setDate(now.getDate() + dayOffset);
        colDate.setHours(0, 0, 0, 0);

        if (colDate.getTime() !== slotDate.getTime()) continue;

        const hourIndex = hour - 5;
        if (hourIndex < 0 || hourIndex >= nextWeek[dayOffset].length) return;

        nextWeek[dayOffset][hourIndex].available = true;
        nextWeek[dayOffset][hourIndex].participants = names;
        return;
      }
    });

    return nextWeek;
  }, [suggestedTimes, schedulingParticipants]);

  const hours = useMemo(() => {
    const hrs: string[] = [];
    for (let h = 5; h < 23; h++) {
      const period = h >= 12 ? "PM" : "AM";
      const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
      hrs.push(`${displayHour}${period}`);
    }
    return hrs;
  }, []);

  if (suggestedTimes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--bg-tertiary)]">
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
            No availability data yet
          </p>
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">
            When the agent calls suggestTimes, suggested slots appear here and on
            time chips.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-auto p-4">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Availability overview
          </h3>
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">
            {schedulingParticipants.length > 0
              ? `Suggested times with ${schedulingParticipants.map((p) => p.memberName).join(", ")}`
              : "Suggested meeting times from the agent"}
          </p>
        </div>

        <div className="relative">
          <div className="mb-2 flex gap-1">
            <div className="w-12 shrink-0" />
            {grid.map((daySlots, dayIndex) => (
              <div
                key={dayIndex}
                className="flex-1 text-center text-[10px] font-medium text-[var(--text-secondary)]"
              >
                {daySlots[0]?.day.split(",")[0]}
                <br />
                <span className="text-[var(--text-tertiary)]">
                  {daySlots[0]?.day.split(",")[1]}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-0.5">
            {hours.map((hourLabel, hourIndex) => (
              <div key={hourIndex} className="flex items-center gap-1">
                <div className="w-12 shrink-0 pr-2 text-right text-[9px] font-medium text-[var(--text-tertiary)]">
                  {hourLabel}
                </div>
                {grid.map((daySlots, dayIndex) => {
                  const cell = daySlots[hourIndex];
                  const isAvailable = cell?.available;

                  return (
                    <div
                      key={dayIndex}
                      className="group relative flex-1"
                      style={{ aspectRatio: "1" }}
                    >
                      <div
                        className={`h-full w-full rounded transition-all ${
                          isAvailable
                            ? "bg-green-500/80 hover:bg-green-500"
                            : "bg-gray-200/40 dark:bg-gray-700/40"
                        }`}
                        title={
                          isAvailable
                            ? `Available at ${hourLabel} on ${cell.day}`
                            : `Not highlighted at ${hourLabel} on ${cell?.day ?? ""}`
                        }
                      />
                      {isAvailable && (
                        <div className="absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[10px] text-white group-hover:block dark:bg-gray-100 dark:text-gray-900">
                          {cell.participants.length > 0
                            ? cell.participants.join(", ")
                            : "Available"}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-4 text-[10px]">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-green-500/80" />
            <span className="text-[var(--text-secondary)]">Suggested</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-gray-200/40 dark:bg-gray-700/40" />
            <span className="text-[var(--text-secondary)]">Other</span>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            Summary
          </p>
          <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
            {suggestedTimes.length} suggested slot
            {suggestedTimes.length !== 1 ? "s" : ""} from the agent.
          </p>
        </div>
      </div>
    </div>
  );
}
