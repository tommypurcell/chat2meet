/**
 * Shared formatting for "User's Google Calendar" system-prompt section.
 * Used by the home page (client fetch) and /api/chat (server fallback).
 */

import { formatFreeBusyAppendix } from "@/lib/calendar-free-gaps";
import { MOCK_CALENDAR_EVENTS, MOCK_CONNECTIONS } from "@/lib/data";

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
 * Use `calendarKind: "demo"` for synthetic `lib/data` schedules (`user_janet`, etc.).
 */
export function formatCalendarEventsForPrompt(
  userId: string,
  events: CalendarEventForPrompt[],
  rangeLabel: string,
  timeZone: string = "America/Los_Angeles",
  nowMs: number = Date.now(),
  calendarKind: "live" | "demo" = "live",
): string {
  const timed = events.filter((e) => isTimedEvent(e.start));

  const headerDemo = `## Demo calendar (synthetic data, user id: \`${userId}\`)`;
  const headerLive = `## User's Google Calendar (live data for user id: ${userId})`;

  if (timed.length === 0) {
    return `

${calendarKind === "demo" ? headerDemo : headerLive}
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
      timeZone,
    });
    const startTime = start.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone,
    });
    const endTime = end.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone,
    });

    lines += `- **${event.summary || "Busy"}** — ${dateStr}, ${startTime}–${endTime}\n`;
  }

  const freeAppendix = formatFreeBusyAppendix(timed, timeZone, nowMs);

  const rules =
    calendarKind === "demo"
      ? "**Rules:** This is **demo** busy/free data (not Google). For questions like \"when is Janet free\", use these gaps or `getSchedule` / `findOverlap` with the matching `user_*` id."
      : '**Rules:** Listings above marked Busy mean the user is **not** available then. For "when am I free", cite the **Free** gaps from the computed section (or say there is no free time if gaps are empty). Never claim "free all day" when that day has any timed event. For other people or other date ranges, use tools if needed.';

  return `

${calendarKind === "demo" ? headerDemo : headerLive}
**Range:** ${rangeLabel}${calendarKind === "live" ? " (primary calendar)" : ""}

### Events (these are BUSY times, not free time)
${lines}
${freeAppendix}
${rules}`;
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

/**
 * Full mock network schedules for the agent (see `MOCK_CALENDAR_EVENTS` in `lib/data.ts`).
 * Omit specific user ids to avoid duplicating the current user's block when it is already in the prompt.
 */
export function formatMockNetworkCalendarsForPrompt(
  timeZone: string = "America/Los_Angeles",
  nowMs: number = Date.now(),
  options?: { omitUserIds?: string[] },
): string {
  const omit = new Set(options?.omitUserIds ?? []);
  const table = MOCK_CONNECTIONS.map(
    (c) => `| ${c.name} | \`${c.userId}\` | ${c.email} |`,
  ).join("\n");

  let out = `

## Demo network calendars (synthetic — \`lib/data.ts\`)
Use these **userId** values in \`getSchedule\` / \`findOverlap\` when the user asks about **Janet**, **Pete**, **Phil**, **Tommy**, etc.

| Name | userId | Email |
|------|--------|-------|
${table}

**Demo dates:** events span **Mar 15–29, 2026** (\`${timeZone}\`). For "next week" inside that window, use the busy/free sections below or call tools with \`startDate\` / \`endDate\` in **YYYY-MM-DD**.

`;

  for (const conn of MOCK_CONNECTIONS) {
    if (omit.has(conn.userId)) continue;
    const raw = MOCK_CALENDAR_EVENTS[conn.userId as keyof typeof MOCK_CALENDAR_EVENTS];
    if (!raw?.length) continue;
    const mapped = raw.map((e) => ({
      summary: e.title,
      start: e.start,
      end: e.end,
    }));
    out += formatCalendarEventsForPrompt(
      conn.userId,
      mapped,
      "Mar 15–29, 2026 (full demo set)",
      timeZone,
      nowMs,
      "demo",
    );
  }

  return out;
}
