/**
 * Shared formatting for "User's Google Calendar" system-prompt section.
 * Used by the home page (client fetch) and /api/chat (server fallback).
 */

import { formatFreeBusyAppendix } from "@/lib/calendar-free-gaps";

export type CalendarEventForPrompt = {
  summary?: string | null;
  start?: string | null;
  end?: string | null;
};

function isTimedEvent(start: string | null | undefined): boolean {
  return Boolean(start && String(start).includes("T"));
}

/**
 * Markdown block for the agent: events the user already fetched from our calendar API.
 * Includes explicit **Busy** vs **Free** gaps by day so the model does not claim "free all day" incorrectly.
 */
export function formatCalendarEventsForPrompt(
  userId: string,
  events: CalendarEventForPrompt[],
  rangeLabel: string,
  timeZone: string = "America/Los_Angeles",
  nowMs: number = Date.now(),
): string {
  const timed = events.filter((e) => isTimedEvent(e.start));

  if (timed.length === 0) {
    return `

## User's Google Calendar (live data for user id: ${userId})
**Range:** ${rangeLabel}
No timed events in this window — the calendar looks free (no dateTime events in range).`;
  }

  let lines = "";
  for (const event of timed) {
    const start = new Date(event.start!);
    const end = new Date(event.end || event.start!);

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

    lines += `- **${event.summary || "Busy"}** — ${dateStr}, ${startTime}–${endTime}\n`;
  }

  const freeAppendix = formatFreeBusyAppendix(timed, timeZone, nowMs);

  return `

## User's Google Calendar (live data for user id: ${userId})
**Range:** ${rangeLabel} (primary calendar)

### Events (these are BUSY times, not free time)
${lines}
${freeAppendix}
**Rules:** Listings above marked Busy mean the user is **not** available then. For "when am I free", cite the **Free** gaps from the computed section (or say there is no free time if gaps are empty). Never claim "free all day" when that day has any timed event. For other people or other date ranges, use tools if needed.`;
}

export function formatNoCalendarConnectedPrompt(userId: string): string {
  return `

## User's Google Calendar (live data for user id: ${userId})
No Google Calendar is connected for this user. Suggest connecting calendar if they ask about their schedule.`;
}

export function formatCalendarLoadErrorPrompt(message: string): string {
  return `

## User's Google Calendar
Could not load calendar data: ${message}.`;
}
