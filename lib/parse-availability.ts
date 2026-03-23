/**
 * Parse natural language availability into grid slot IDs
 *
 * Examples:
 * - "10-2 on Tuesday" → ["0-2", "0-3", "0-4", "0-5", "0-6", "0-7", "0-8", "0-9"]
 * - "9-12 and 1:30-3 both days" → multiple slot IDs across days
 * - "10:00-14:00" → slot IDs for that time range
 */

type CellKey = `${number}-${number}`;

interface ParseAvailabilityInput {
  availabilityText: string;
  dateRangeStart: string; // ISO date or friendly
  dateRangeEnd: string;
  timezone: string;
}

interface TimeRange {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

interface ParsedTime {
  hour: number;
  minute: number;
  hadPeriod: boolean;
}

/**
 * Parse time strings like "10", "10:00", "2pm", "14:00"
 * Returns 24-hour format { hour, minute }
 */
function parseTime(timeStr: string): ParsedTime | null {
  const trimmed = timeStr.toLowerCase().trim();

  if (trimmed === "noon") {
    return { hour: 12, minute: 0, hadPeriod: false };
  }

  if (trimmed === "midnight") {
    return { hour: 0, minute: 0, hadPeriod: false };
  }

  // Match patterns: "10", "10:00", "10:30", "2pm", "2:30pm"
  const match = trimmed.match(/^(\d{1,2})(?::(\d{2}))?(?:\s*(am|pm))?$/);

  if (!match) return null;

  let hour = parseInt(match[1]);
  const minute = match[2] ? parseInt(match[2]) : 0;
  const period = match[3];

  // Handle AM/PM
  if (period === 'pm' && hour < 12) hour += 12;
  if (period === 'am' && hour === 12) hour = 0;

  // Validate
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return { hour, minute, hadPeriod: Boolean(period) };
}

/**
 * Parse time range like "10-2", "9:00-12:00", "10am-2pm"
 */
function buildTimeRange(start: ParsedTime, end: ParsedTime): TimeRange | null {
  if (!start || !end) return null;

  let startHour = start.hour;
  let endHour = end.hour;

  // Meeting shorthand like "12-3" or "1:30-3" usually means daytime hours.
  if (!start.hadPeriod && startHour >= 1 && startHour <= 7) {
    startHour += 12;
  }
  if (!end.hadPeriod && endHour >= 1 && endHour <= 7) {
    endHour += 12;
  }

  if (!start.hadPeriod && !end.hadPeriod && endHour <= startHour && endHour + 12 <= 23) {
    endHour += 12;
  }

  return {
    startHour,
    startMinute: start.minute,
    endHour,
    endMinute: end.minute,
  };
}

/**
 * Convert time to slot index (assuming 30-min slots starting at 9:00 AM)
 * 9:00 → 0, 9:30 → 1, 10:00 → 2, etc.
 */
function timeToSlotIndex(hour: number, minute: number): number {
  const startHour = 9; // Grid starts at 9 AM
  const minutesFromStart = (hour - startHour) * 60 + minute;
  return Math.floor(minutesFromStart / 30);
}

/**
 * Generate all dates in range
 */
function generateDates(start: string, end: string): Date[] {
  const dates: Date[] = [];
  const startDate = new Date(start);
  const endDate = new Date(end);

  const current = new Date(startDate);
  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Main parser function
 */
export function parseAvailability({
  availabilityText,
  dateRangeStart,
  dateRangeEnd,
  timezone,
}: ParseAvailabilityInput): CellKey[] {
  console.log('=== PARSE AVAILABILITY ===');
  console.log('Input:', { availabilityText, dateRangeStart, dateRangeEnd, timezone });

  const slots: Set<CellKey> = new Set();

  try {
    // Generate all days in the event range
    const dates = generateDates(dateRangeStart, dateRangeEnd);
    console.log('Generated dates:', dates.map(d => d.toISOString()));

    // Parse availability text to extract time ranges
    // Look for patterns like:
    // - "10-2", "9-12", "1:30-3"
    // - "both days", "all days", "every day"
    // - "Monday", "Tuesday" (specific days)

    const text = availabilityText.toLowerCase();

    // Check if it applies to all days
    const appliesToAllDays =
      text.includes('both days') ||
      text.includes('all days') ||
      text.includes('every day') ||
      text.includes('each day');

    console.log('Applies to all days?', appliesToAllDays);

    const timeToken = "(?:\\d{1,2}(?::\\d{2})?(?:\\s*(?:am|pm))?|noon|midnight)";
    const patterns = [
      new RegExp(`(${timeToken})\\s*[-–]\\s*(${timeToken})`, "g"),
      new RegExp(`from\\s+(${timeToken})\\s+(?:to|until)\\s+(${timeToken})`, "g"),
      new RegExp(`between\\s+(${timeToken})\\s+and\\s+(${timeToken})`, "g"),
      new RegExp(`(${timeToken})\\s+(?:to|until)\\s+(${timeToken})`, "g"),
    ];

    const matchedRanges: string[] = [];
    const timeRanges: TimeRange[] = [];

    for (const pattern of patterns) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        const start = parseTime(match[1]);
        const end = parseTime(match[2]);
        if (!start || !end) continue;

        const range = buildTimeRange(start, end);
        if (!range) continue;

        matchedRanges.push(match[0]);
        timeRanges.push(range);
        console.log('Parsed range:', match[0], '→', range);
      }
    }

    console.log('Time range matches:', matchedRanges);

    if (timeRanges.length === 0) {
      // No specific time ranges found - return empty
      console.warn('No time ranges found in availability text:', availabilityText);
      return [];
    }

    console.log('Total time ranges:', timeRanges.length);

    // Generate slot IDs for each day and time range
    dates.forEach((date, dayIdx) => {
      for (const range of timeRanges) {
        // Generate slots for this time range in 30-minute intervals
        let currentHour = range.startHour;
        let currentMinute = range.startMinute;

        while (
          currentHour < range.endHour ||
          (currentHour === range.endHour && currentMinute < range.endMinute)
        ) {
          const slotIdx = timeToSlotIndex(currentHour, currentMinute);

          // Only add if it's within valid grid bounds (9 AM - 5 PM)
          if (slotIdx >= 0 && slotIdx <= 16) {
            const key: CellKey = `${dayIdx}-${slotIdx}`;

            // Only add if applies to all days, or if this is the first day
            // (simple heuristic - can be improved with day-specific parsing)
            if (appliesToAllDays || dayIdx === 0 || dates.length === 1) {
              slots.add(key);
            }
          }

          // Increment by 30 minutes
          currentMinute += 30;
          if (currentMinute >= 60) {
            currentMinute = 0;
            currentHour++;
          }
        }
      }
    });

    const result = Array.from(slots).sort();
    console.log('=== PARSE RESULT ===');
    console.log('Generated slots:', result);
    console.log('Total slots:', result.length);

    return result;
  } catch (error) {
    console.error('Error parsing availability:', error);
    return [];
  }
}

/**
 * Convert slot IDs back to human-readable format
 * Useful for debugging and display
 */
export function slotsToText(slots: CellKey[], dates: string[]): string {
  if (slots.length === 0) return 'No availability';

  // Group by day
  const byDay: Record<number, number[]> = {};

  for (const slot of slots) {
    const [dayStr, slotStr] = slot.split('-');
    const dayIdx = parseInt(dayStr);
    const slotIdx = parseInt(slotStr);

    if (!byDay[dayIdx]) byDay[dayIdx] = [];
    byDay[dayIdx].push(slotIdx);
  }

  const parts: string[] = [];

  for (const [dayIdxStr, slotIndices] of Object.entries(byDay)) {
    const dayIdx = parseInt(dayIdxStr);
    const dateStr = dates[dayIdx] || `Day ${dayIdx + 1}`;

    // Convert slot indices to time ranges
    slotIndices.sort((a, b) => a - b);

    const ranges: string[] = [];
    let rangeStart = slotIndices[0];
    let rangeLast = slotIndices[0];

    for (let i = 1; i <= slotIndices.length; i++) {
      const slot = slotIndices[i];

      if (slot === rangeLast + 1) {
        // Continue range
        rangeLast = slot;
      } else {
        // End range
        const startTime = slotIndexToTime(rangeStart);
        const endTime = slotIndexToTime(rangeLast + 1); // End is exclusive
        ranges.push(`${startTime}-${endTime}`);

        if (i < slotIndices.length) {
          rangeStart = slot;
          rangeLast = slot;
        }
      }
    }

    parts.push(`${dateStr}: ${ranges.join(', ')}`);
  }

  return parts.join('; ');
}

function slotIndexToTime(slotIdx: number): string {
  const startHour = 9;
  const totalMinutes = slotIdx * 30;
  const hour = startHour + Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;

  return `${hour}:${minute.toString().padStart(2, '0')}`;
}
