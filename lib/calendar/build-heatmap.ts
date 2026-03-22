/**
 * Server-side heatmap slot computation
 *
 * Given a list of user IDs and a date range:
 * 1. Fetch each user's busy events
 * 2. Generate candidate time slots
 * 3. Test each slot against each user's busy blocks
 * 4. Return structured HeatmapSlot[] data
 */

import { HeatmapSlot, HeatmapRequest } from "../heatmap-types";
import { collection } from "../api-helpers";

interface BusyBlock {
  start: Date;
  end: Date;
}

interface UserBusyBlocks {
  userId: string;
  busyBlocks: BusyBlock[];
}

/**
 * Check if a time slot overlaps with any busy blocks
 */
function isSlotFree(slotStart: Date, slotEnd: Date, busyBlocks: BusyBlock[]): boolean {
  for (const block of busyBlocks) {
    // Overlap if: slot starts before block ends AND slot ends after block starts
    if (slotStart < block.end && slotEnd > block.start) {
      return false;
    }
  }
  return true;
}

/**
 * Fetch busy events for a single user from Firestore calendars collection
 */
async function fetchUserBusyBlocks(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<BusyBlock[]> {
  try {
    // Try to fetch from calendars/{userId} snapshot
    const calendarDoc = await collection("calendars").doc(userId).get();

    if (!calendarDoc.exists) {
      console.log(`No calendar data for user ${userId}`);
      return [];
    }

    const data = calendarDoc.data();
    const events = data?.events || [];

    const busyBlocks: BusyBlock[] = [];

    for (const event of events) {
      if (!event.start || !event.end) continue;

      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);

      // Filter to only events within the requested range
      if (eventEnd >= startDate && eventStart <= endDate) {
        busyBlocks.push({
          start: eventStart,
          end: eventEnd,
        });
      }
    }

    return busyBlocks;
  } catch (error) {
    console.error(`Error fetching calendar for user ${userId}:`, error);
    return [];
  }
}

/**
 * Generate candidate time slots
 */
function generateCandidateSlots(
  startDate: Date,
  endDate: Date,
  durationMinutes: number,
  slotIntervalMinutes: number,
  timezone: string
): Array<{ start: Date; end: Date }> {
  const slots: Array<{ start: Date; end: Date }> = [];

  // Business hours: 8 AM to 9 PM
  const START_HOUR = 8;
  const END_HOUR = 21;

  let currentDay = new Date(startDate);
  currentDay.setHours(0, 0, 0, 0);

  while (currentDay <= endDate) {
    // Generate slots for this day
    for (let hour = START_HOUR; hour < END_HOUR; hour++) {
      for (let minute = 0; minute < 60; minute += slotIntervalMinutes) {
        const slotStart = new Date(currentDay);
        slotStart.setHours(hour, minute, 0, 0);

        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + durationMinutes);

        // Only add if slot ends before end hour
        if (slotEnd.getHours() <= END_HOUR) {
          slots.push({ start: slotStart, end: slotEnd });
        }
      }
    }

    // Move to next day
    currentDay.setDate(currentDay.getDate() + 1);
  }

  return slots;
}

/**
 * Format time for display (e.g., "6:00 PM")
 */
function formatTimeLabel(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Build heatmap slots from user availability
 */
export async function buildHeatmapSlots(
  request: HeatmapRequest
): Promise<HeatmapSlot[]> {
  const {
    userIds,
    startDate: startDateStr,
    endDate: endDateStr,
    durationMinutes,
    timezone,
    slotIntervalMinutes = 30,
  } = request;

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  // Fetch busy blocks for all users
  const userBusyData: UserBusyBlocks[] = await Promise.all(
    userIds.map(async (userId) => ({
      userId,
      busyBlocks: await fetchUserBusyBlocks(userId, startDate, endDate),
    }))
  );

  // Generate candidate slots
  const candidateSlots = generateCandidateSlots(
    startDate,
    endDate,
    durationMinutes,
    slotIntervalMinutes,
    timezone
  );

  // Test each slot against each user's availability
  const heatmapSlots: HeatmapSlot[] = candidateSlots.map((slot) => {
    const availableUserIds: string[] = [];
    const unavailableUserIds: string[] = [];

    for (const userData of userBusyData) {
      if (isSlotFree(slot.start, slot.end, userData.busyBlocks)) {
        availableUserIds.push(userData.userId);
      } else {
        unavailableUserIds.push(userData.userId);
      }
    }

    const availableCount = availableUserIds.length;
    const totalCount = userIds.length;
    const score = totalCount > 0 ? availableCount / totalCount : 0;

    return {
      day: slot.start.toISOString().split("T")[0],
      timeLabel: formatTimeLabel(slot.start),
      start: slot.start.toISOString(),
      end: slot.end.toISOString(),
      availableCount,
      totalCount,
      score,
      availableUserIds,
      unavailableUserIds,
    };
  });

  return heatmapSlots;
}
