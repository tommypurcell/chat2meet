"use client";

import { useMemo } from "react";

interface TimeSlot {
  day: string; // e.g., "Monday", "Mar 23"
  hour: number; // 0-23
  available: boolean;
  participants: string[];
}

interface AvailabilityHeatmapProps {
  messages: any[];
  schedulingParticipants?: Array<{
    memberUserId: string;
    memberName: string;
    memberEmail: string;
  }>;
}

export function AvailabilityHeatmap({
  messages,
  schedulingParticipants = [],
}: AvailabilityHeatmapProps) {
  // Extract suggested times from tool results - same logic as ChatContent
  const suggestedTimes = useMemo(() => {
    const times = messages
      .filter((msg) => msg.role === "assistant")
      .flatMap((msg) => {
        return (
          msg.toolResults
            ?.filter((result: any) => result.toolName === "suggestTimes")
            .flatMap((result: any) => result.result?.suggestedTimes || []) || []
        );
      });

    console.log("=== HEATMAP: Extracted times ===", times);
    return times;
  }, [messages]);

  // Extract availability data from messages
  const availabilityData = useMemo(() => {
    // Look for availability information in assistant messages
    const assistantMessages = messages
      .filter((msg) => msg.role === "assistant")
      .map((msg) =>
        msg.parts
          ? msg.parts.map((p: any) => p.text || "").join("")
          : msg.content || ""
      );

    const fullText = assistantMessages.join("\n");

    // Parse days and time ranges from the text
    // Example: "Monday, March 23: You are all free from 5:00 PM to 10:00 PM"
    const dayRegex =
      /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+\w+\s+\d+/gi;

    const days = fullText.match(dayRegex) || [];

    // Parse time availability mentions
    // Matches patterns like "5:00 PM to 10:00 PM" or "anytime from 6:00 PM to 10:00 PM"
    const availabilityMatches: Array<{
      day: string;
      startHour: number;
      endHour: number;
    }> = [];

    // Split text by lines and parse each line
    const lines = fullText.split("\n");
    for (const line of lines) {
      // Look for day mentions with time ranges
      const dayMatch = line.match(
        /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d+)/i
      );

      if (dayMatch) {
        const dayName = dayMatch[1];
        const month = dayMatch[2];
        const dayNum = dayMatch[3];

        // Look for time ranges in the same line
        const timeMatches = line.matchAll(
          /(\d+):(\d+)\s*(AM|PM)\s+(?:to|and)\s+(\d+):(\d+)\s*(AM|PM)/gi
        );

        for (const timeMatch of timeMatches) {
          let startHour = parseInt(timeMatch[1]);
          const startMin = parseInt(timeMatch[2]);
          const startPeriod = timeMatch[3].toUpperCase();
          let endHour = parseInt(timeMatch[4]);
          const endMin = parseInt(timeMatch[5]);
          const endPeriod = timeMatch[6].toUpperCase();

          // Convert to 24-hour format
          if (startPeriod === "PM" && startHour !== 12) startHour += 12;
          if (startPeriod === "AM" && startHour === 12) startHour = 0;
          if (endPeriod === "PM" && endHour !== 12) endHour += 12;
          if (endPeriod === "AM" && endHour === 12) endHour = 0;

          availabilityMatches.push({
            day: `${dayName}, ${month} ${dayNum}`,
            startHour,
            endHour,
          });
        }
      }
    }

    return {
      days,
      fullText,
      suggestedTimes,
      availabilityMatches,
    };
  }, [messages, suggestedTimes]);

  // Create a 7-day by 24-hour grid
  const grid = useMemo(() => {
    const now = new Date();
    const nextWeek: TimeSlot[][] = [];

    // Get next 7 days starting from today
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date(now);
      date.setDate(now.getDate() + dayOffset);

      const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
      const monthDay = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const dayLabel = `${dayName}, ${monthDay}`;

      const daySlots: TimeSlot[] = [];

      // Only show business hours (5 AM to 11 PM)
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

    // Mark available slots based on suggested times
    suggestedTimes.forEach((slot: any) => {
      console.log("Processing slot:", slot);

      // Parse the time (e.g., "5:00 PM") and date (e.g., "Mon Mar 25")
      const timeStr = slot.time || "";
      const dateStr = slot.date || "";

      // Extract hour from time string (e.g., "5:00 PM" -> 17)
      const timeMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!timeMatch) {
        console.log("Could not parse time:", timeStr);
        return;
      }

      let hour = parseInt(timeMatch[1]);
      const period = timeMatch[3].toUpperCase();

      // Convert to 24-hour format
      if (period === "PM" && hour !== 12) hour += 12;
      if (period === "AM" && hour === 12) hour = 0;

      // Find which day this corresponds to
      // dateStr format is like "Mon Mar 25" or "Monday, March 25"
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const dayLabel = nextWeek[dayOffset][0]?.day;

        // Check if the date string contains this day's label
        // Extract just the day part for matching
        const dayParts = dayLabel.split(",");
        const shortDay = dayParts[0].trim(); // e.g., "Mon"

        if (dateStr.includes(shortDay) || dateStr.toLowerCase().includes(shortDay.toLowerCase())) {
          const hourIndex = hour - 5; // Offset because we start at 5 AM
          if (hourIndex >= 0 && hourIndex < nextWeek[dayOffset].length) {
            nextWeek[dayOffset][hourIndex].available = true;
            if (schedulingParticipants.length > 0) {
              nextWeek[dayOffset][hourIndex].participants =
                schedulingParticipants.map((p) => p.memberName);
            }
            console.log(`Marked ${dayLabel} at ${hour}:00 (index ${hourIndex}) as available`);
          }
          break;
        }
      }
    });

    // Also mark slots from parsed text availability
    availabilityData.availabilityMatches.forEach((match) => {
      // Find which day of week this is
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        if (nextWeek[dayOffset][0]?.day === match.day) {
          // Mark all hours in the range as available
          for (let hour = match.startHour; hour < match.endHour; hour++) {
            const hourIndex = hour - 5; // Offset because we start at 5 AM
            if (hourIndex >= 0 && hourIndex < nextWeek[dayOffset].length) {
              nextWeek[dayOffset][hourIndex].available = true;
              if (schedulingParticipants.length > 0) {
                nextWeek[dayOffset][hourIndex].participants =
                  schedulingParticipants.map((p) => p.memberName);
              }
            }
          }
          break;
        }
      }
    });

    return nextWeek;
  }, [suggestedTimes, schedulingParticipants]);

  const hours = useMemo(() => {
    const hrs = [];
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
            No availability data yet
          </p>
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">
            Ask the agent about meeting times to see availability
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
            Availability Overview
          </h3>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            {schedulingParticipants.length > 0
              ? `Showing availability for ${schedulingParticipants.map((p) => p.memberName).join(", ")}`
              : "Showing suggested meeting times"}
          </p>
        </div>

        <div className="relative">
          {/* Day labels */}
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

          {/* Heatmap grid */}
          <div className="space-y-0.5">
            {hours.map((hourLabel, hourIndex) => (
              <div key={hourIndex} className="flex items-center gap-1">
                <div className="w-12 shrink-0 text-right text-[9px] font-medium text-[var(--text-tertiary)] pr-2">
                  {hourLabel}
                </div>
                {grid.map((daySlots, dayIndex) => {
                  const slot = daySlots[hourIndex];
                  const isAvailable = slot?.available;

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
                            ? `Available at ${hourLabel} on ${slot.day}`
                            : `Not available at ${hourLabel} on ${slot.day}`
                        }
                      />
                      {isAvailable && (
                        <div className="absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[10px] text-white group-hover:block dark:bg-gray-100 dark:text-gray-900">
                          {slot.participants.length > 0
                            ? slot.participants.join(", ")
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

        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-4 text-[10px]">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-green-500/80" />
            <span className="text-[var(--text-secondary)]">Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-gray-200/40 dark:bg-gray-700/40" />
            <span className="text-[var(--text-secondary)]">Not available</span>
          </div>
        </div>

        {/* Summary */}
        {availabilityData.days.length > 0 && (
          <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
              Summary
            </p>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Found {suggestedTimes.length} available time slot
              {suggestedTimes.length !== 1 ? "s" : ""} across{" "}
              {availabilityData.days.length} day
              {availabilityData.days.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
