/**
 * Calendar utility functions for transforming Google Calendar events
 * into busy blocks and free windows for the agent
 */

export interface BusyBlock {
  start: string; // ISO 8601
  end: string; // ISO 8601
}

export interface FreeWindow {
  start: string; // ISO 8601
  end: string; // ISO 8601
  quality: "high" | "medium" | "low";
}

export interface TimeSlot {
  start: string;
  end: string;
  availableUsers: string[];
  unavailableUsers: string[];
}

/**
 * Convert Google Calendar events to busy blocks
 * Filters out declined events and all-day events
 */
export function eventsToBusyBlocks(events: any[]): BusyBlock[] {
  const busyBlocks: BusyBlock[] = [];

  for (const event of events) {
    // Skip declined events
    if (event.status === "cancelled") continue;

    // Skip all-day events (no dateTime)
    if (!event.start?.dateTime) continue;

    // Skip if user has declined
    if (
      event.attendees?.some(
        (a: any) => a.self === true && a.responseStatus === "declined"
      )
    ) {
      continue;
    }

    busyBlocks.push({
      start: event.start.dateTime,
      end: event.end?.dateTime || event.start.dateTime,
    });
  }

  // Sort by start time
  busyBlocks.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  return busyBlocks;
}

/**
 * Merge overlapping busy blocks into consolidated blocks
 */
export function mergeBusyBlocks(blocks: BusyBlock[]): BusyBlock[] {
  if (blocks.length === 0) return [];

  const sorted = [...blocks].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  const merged: BusyBlock[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    const lastEnd = new Date(last.end).getTime();
    const currentStart = new Date(current.start).getTime();

    // If blocks overlap or are adjacent, merge them
    if (currentStart <= lastEnd) {
      const currentEnd = new Date(current.end).getTime();
      last.end = new Date(Math.max(lastEnd, currentEnd)).toISOString();
    } else {
      merged.push(current);
    }
  }

  return merged;
}

/**
 * Calculate free windows from busy blocks within a date range
 */
export function calculateFreeWindows(
  busyBlocks: BusyBlock[],
  rangeStart: Date,
  rangeEnd: Date,
  workingHoursStart: number = 9, // 9 AM
  workingHoursEnd: number = 17 // 5 PM
): FreeWindow[] {
  const merged = mergeBusyBlocks(busyBlocks);
  const freeWindows: FreeWindow[] = [];

  let currentTime = new Date(rangeStart);

  for (const block of merged) {
    const blockStart = new Date(block.start);

    // If there's a gap between current time and this busy block
    if (currentTime < blockStart) {
      const freeStart = currentTime;
      const freeEnd = blockStart;

      // Split free window by days and working hours
      const dayWindows = splitByWorkingHours(
        freeStart,
        freeEnd,
        workingHoursStart,
        workingHoursEnd
      );

      freeWindows.push(...dayWindows);
    }

    currentTime = new Date(Math.max(currentTime.getTime(), new Date(block.end).getTime()));
  }

  // Add final free window if there's time after the last busy block
  if (currentTime < rangeEnd) {
    const dayWindows = splitByWorkingHours(
      currentTime,
      rangeEnd,
      workingHoursStart,
      workingHoursEnd
    );
    freeWindows.push(...dayWindows);
  }

  return freeWindows;
}

/**
 * Split a time range into working hours windows and assign quality
 */
function splitByWorkingHours(
  start: Date,
  end: Date,
  workingStart: number,
  workingEnd: number
): FreeWindow[] {
  const windows: FreeWindow[] = [];
  let current = new Date(start);

  while (current < end) {
    const dayStart = new Date(current);
    dayStart.setHours(workingStart, 0, 0, 0);

    const dayEnd = new Date(current);
    dayEnd.setHours(workingEnd, 0, 0, 0);

    const windowStart = new Date(Math.max(current.getTime(), dayStart.getTime()));
    const windowEnd = new Date(Math.min(end.getTime(), dayEnd.getTime()));

    if (windowStart < windowEnd) {
      const hour = windowStart.getHours();
      const duration = (windowEnd.getTime() - windowStart.getTime()) / (1000 * 60); // minutes

      // Assign quality based on time of day and duration
      let quality: "high" | "medium" | "low" = "medium";

      if (hour >= 10 && hour <= 15 && duration >= 60) {
        quality = "high"; // Mid-day, good length
      } else if (hour < 9 || hour > 16 || duration < 30) {
        quality = "low"; // Early morning, late afternoon, or too short
      }

      windows.push({
        start: windowStart.toISOString(),
        end: windowEnd.toISOString(),
        quality,
      });
    }

    // Move to next day
    current.setDate(current.getDate() + 1);
    current.setHours(0, 0, 0, 0);
  }

  return windows;
}

/**
 * Find overlapping free windows for multiple users
 */
export function findCommonFreeSlots(
  userAvailability: Map<string, FreeWindow[]>,
  minDuration: number = 30 // minutes
): TimeSlot[] {
  const allUsers = Array.from(userAvailability.keys());
  if (allUsers.length === 0) return [];

  // Get all unique time boundaries
  const boundaries = new Set<number>();
  for (const windows of userAvailability.values()) {
    for (const window of windows) {
      boundaries.add(new Date(window.start).getTime());
      boundaries.add(new Date(window.end).getTime());
    }
  }

  const sortedBoundaries = Array.from(boundaries).sort((a, b) => a - b);

  // Check each time segment for availability
  const commonSlots: TimeSlot[] = [];

  for (let i = 0; i < sortedBoundaries.length - 1; i++) {
    const segmentStart = new Date(sortedBoundaries[i]);
    const segmentEnd = new Date(sortedBoundaries[i + 1]);

    const duration = (segmentEnd.getTime() - segmentStart.getTime()) / (1000 * 60);
    if (duration < minDuration) continue;

    const availableUsers: string[] = [];
    const unavailableUsers: string[] = [];

    // Check which users are free during this segment
    for (const user of allUsers) {
      const userWindows = userAvailability.get(user) || [];
      const isFree = userWindows.some((window) => {
        const windowStart = new Date(window.start).getTime();
        const windowEnd = new Date(window.end).getTime();
        return (
          windowStart <= sortedBoundaries[i] &&
          windowEnd >= sortedBoundaries[i + 1]
        );
      });

      if (isFree) {
        availableUsers.push(user);
      } else {
        unavailableUsers.push(user);
      }
    }

    if (availableUsers.length > 0) {
      commonSlots.push({
        start: segmentStart.toISOString(),
        end: segmentEnd.toISOString(),
        availableUsers,
        unavailableUsers,
      });
    }
  }

  // Merge adjacent slots with same availability
  return mergeAdjacentSlots(commonSlots);
}

/**
 * Merge adjacent time slots that have the same user availability
 */
function mergeAdjacentSlots(slots: TimeSlot[]): TimeSlot[] {
  if (slots.length === 0) return [];

  const merged: TimeSlot[] = [slots[0]];

  for (let i = 1; i < slots.length; i++) {
    const current = slots[i];
    const last = merged[merged.length - 1];

    const sameUsers =
      JSON.stringify(last.availableUsers.sort()) ===
        JSON.stringify(current.availableUsers.sort()) &&
      JSON.stringify(last.unavailableUsers.sort()) ===
        JSON.stringify(current.unavailableUsers.sort());

    const adjacent = last.end === current.start;

    if (sameUsers && adjacent) {
      last.end = current.end;
    } else {
      merged.push(current);
    }
  }

  return merged;
}

/**
 * Format time slots for LLM consumption
 */
export function formatSlotsForLLM(slots: TimeSlot[]): string {
  if (slots.length === 0) {
    return "No common free time slots found.";
  }

  const formatted = slots
    .slice(0, 10) // Top 10 slots
    .map((slot, i) => {
      const start = new Date(slot.start);
      const end = new Date(slot.end);
      const duration = (end.getTime() - start.getTime()) / (1000 * 60);

      const dateStr = start.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      const startTime = start.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      const endTime = end.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      return `${i + 1}. ${dateStr}, ${startTime} - ${endTime} (${duration} min) - ${slot.availableUsers.length} available: ${slot.availableUsers.join(", ")}`;
    })
    .join("\n");

  return `Available time slots:\n${formatted}`;
}
