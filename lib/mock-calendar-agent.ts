import { MOCK_CALENDAR_EVENTS, MOCK_CONNECTIONS } from "@/lib/data";
import type { BusyBlock } from "@/lib/calendar-utils";
import { eventsToBusyBlocks } from "@/lib/calendar-utils";

/** All synthetic events in `MOCK_CALENDAR_EVENTS` fall in this window. */
export const MOCK_DEMO_DATE_RANGE = {
  start: "2026-03-15",
  end: "2026-03-29",
} as const;

/**
 * Map tool input to a key in `MOCK_CALENDAR_EVENTS` (`janet`, `phil`, …).
 * Accepts `user_janet`, `Janet`, `janet`, etc. Returns null if not a demo person.
 */
export function resolveMockCalendarId(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  const keys = Object.keys(MOCK_CALENDAR_EVENTS) as string[];
  if (keys.includes(s)) return s;

  const lower = s.toLowerCase();
  for (const k of keys) {
    if (k.toLowerCase() === lower) return k;
  }

  const stripped = s.startsWith("user_") ? s.slice(5) : s;
  if (keys.includes(stripped)) return stripped;
  const sl = stripped.toLowerCase();
  for (const k of keys) {
    if (k.toLowerCase() === sl) return k;
  }

  for (const c of MOCK_CONNECTIONS) {
    if (c.name.toLowerCase() === lower) return c.userId;
    const first = c.name.split(/\s+/)[0]?.toLowerCase();
    if (first && first === lower) return c.userId;
  }
  return null;
}

export function isMockCalendarUserId(raw: string): boolean {
  return resolveMockCalendarId(raw) !== null;
}

function filterMockEventsInRangeForKey(
  key: string,
  startDate: string,
  endDate: string,
): { start: string; end: string; title: string }[] {
  const list = MOCK_CALENDAR_EVENTS[key as keyof typeof MOCK_CALENDAR_EVENTS];
  if (!list) return [];
  const rangeStart = new Date(`${startDate}T00:00:00`);
  const rangeEnd = new Date(`${endDate}T23:59:59.999`);
  return list.filter((e) => {
    const es = new Date(e.start);
    const ee = new Date(e.end);
    return ee > rangeStart && es < rangeEnd;
  });
}

/**
 * If the model passes "next week" in real-world dates that don't overlap Mar 2026 demo data,
 * clamp to the demo window so filters return events.
 */
export function effectiveMockQueryRange(
  startDate: string,
  endDate: string,
): { start: string; end: string; usedDemoFallback: boolean } {
  const rs = new Date(`${startDate}T00:00:00`);
  const re = new Date(`${endDate}T23:59:59.999`);
  const ds = new Date(`${MOCK_DEMO_DATE_RANGE.start}T00:00:00`);
  const de = new Date(`${MOCK_DEMO_DATE_RANGE.end}T23:59:59.999`);
  const overlaps = re.getTime() >= ds.getTime() && rs.getTime() <= de.getTime();
  if (!overlaps) {
    return {
      start: MOCK_DEMO_DATE_RANGE.start,
      end: MOCK_DEMO_DATE_RANGE.end,
      usedDemoFallback: true,
    };
  }
  const effStart = new Date(Math.max(rs.getTime(), ds.getTime()));
  const effEnd = new Date(Math.min(re.getTime(), de.getTime()));
  const pad = (n: number) => String(n).padStart(2, "0");
  const ymd = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return {
    start: ymd(effStart),
    end: ymd(effEnd),
    usedDemoFallback: false,
  };
}

export function getMockFilteredEventsForTool(
  userId: string,
  startDate: string,
  endDate: string,
): {
  canonicalId: string;
  events: { start: string; end: string; title: string }[];
  usedDemoDateFallback: boolean;
  note?: string;
} {
  const key = resolveMockCalendarId(userId);
  if (!key) {
    return { canonicalId: userId, events: [], usedDemoDateFallback: false };
  }
  const eff = effectiveMockQueryRange(startDate, endDate);
  let events = filterMockEventsInRangeForKey(key, eff.start, eff.end);
  let usedDemoDateFallback = eff.usedDemoFallback;
  if (events.length === 0) {
    events = filterMockEventsInRangeForKey(
      key,
      MOCK_DEMO_DATE_RANGE.start,
      MOCK_DEMO_DATE_RANGE.end,
    );
    usedDemoDateFallback = true;
  }
  const note = usedDemoDateFallback
    ? "Demo data is dated Mar 15–29, 2026 (America/Los_Angeles). Your date range did not overlap that window or had no events — returning the full demo range."
    : undefined;
  return { canonicalId: key, events, usedDemoDateFallback, note };
}

/** @deprecated Prefer getMockFilteredEventsForTool — kept for call sites that only need rows. */
export function filterMockEventsInRange(
  userId: string,
  startDate: string,
  endDate: string,
): { start: string; end: string; title: string }[] {
  return getMockFilteredEventsForTool(userId, startDate, endDate).events;
}

function mockRowsToGoogleShaped(
  rows: readonly { start: string; end: string; title: string }[],
) {
  return rows.map((e) => ({
    start: { dateTime: e.start },
    end: { dateTime: e.end },
    summary: e.title,
    status: "confirmed" as const,
  }));
}

export function mockEventsToBusyBlocks(
  rows: readonly { start: string; end: string; title: string }[],
): BusyBlock[] {
  return eventsToBusyBlocks(mockRowsToGoogleShaped(rows) as unknown[]);
}
