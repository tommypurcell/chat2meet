import { addDays, endOfDay, format, startOfDay } from "date-fns";
import { TZDate } from "@date-fns/tz";
import { eventsToBusyBlocks, mergeBusyBlocks } from "@/lib/calendar-utils";

/** Same shape as calendar API / `format-calendar-for-prompt` events (avoid circular imports). */
export type EventForGaps = {
  summary?: string | null;
  start?: string | null;
  end?: string | null;
};

function isTimedStart(start: string | null | undefined): boolean {
  return Boolean(start && String(start).includes("T"));
}

/** Busy intervals in [t0,t1] after clipping merged blocks to the window. */
function freeGapsInWindow(
  t0: number,
  t1: number,
  busyIso: { start: string; end: string }[],
): [number, number][] {
  if (t1 <= t0) return [];

  const clipped = busyIso
    .map((b) => {
      const s = new Date(b.start).getTime();
      const e = new Date(b.end).getTime();
      return {
        s: Math.max(s, t0),
        e: Math.min(e, t1),
      };
    })
    .filter((b) => b.e > t0 && b.s < t1 && b.s < b.e)
    .sort((a, b) => a.s - b.s);

  const gaps: [number, number][] = [];
  let cur = t0;
  for (const b of clipped) {
    if (cur < b.s) gaps.push([cur, b.s]);
    cur = Math.max(cur, b.e);
  }
  if (cur < t1) gaps.push([cur, t1]);
  return gaps;
}

function formatInstant(ms: number, timeZone: string): string {
  return format(new TZDate(ms, timeZone), "h:mm a");
}

/**
 * Explicit free vs busy text so the model does not claim "free all day" when events exist.
 */
export function formatFreeBusyAppendix(
  events: EventForGaps[],
  timeZone: string,
  nowMs: number = Date.now(),
): string {
  const timed = events.filter((e) => isTimedStart(e.start));
  if (timed.length === 0) return "";

  const googleLike = timed.map((e) => ({
    status: "confirmed" as const,
    start: { dateTime: e.start! },
    end: { dateTime: (e.end || e.start)! },
  }));

  const busyMerged = mergeBusyBlocks(eventsToBusyBlocks(googleLike));
  const busyIso = busyMerged.map((b) => ({ start: b.start, end: b.end }));

  const zNow = new TZDate(nowMs, timeZone);
  const lines: string[] = [];

  lines.push(
    `### Computed availability (${timeZone})`,
    `- Each **Busy** interval below means you are **not** free then.`,
    `- **Free** lists gaps inside that calendar day (midnight–midnight local).`,
    `- Do **not** say you are "free all day" if any busy interval exists that day.`,
    "",
  );

  for (let d = 0; d < 8; d++) {
    const day = addDays(startOfDay(zNow), d);
    const t0 = startOfDay(day).getTime();
    const t1 = endOfDay(day).getTime();

    const dayLabel = format(new TZDate(t0, timeZone), "EEE, MMM d, yyyy");
    const gaps = freeGapsInWindow(t0, t1, busyIso);

    const busyToday = busyIso.filter((b) => {
      const s = new Date(b.start).getTime();
      const e = new Date(b.end).getTime();
      return e > t0 && s < t1;
    });

    if (busyToday.length === 0) {
      lines.push(
        `- **${dayLabel}:** No timed events — **free all day** (no timed holds).`,
      );
      continue;
    }

    const busyStr = busyToday
      .map((b) => {
        const s = Math.max(new Date(b.start).getTime(), t0);
        const e = Math.min(new Date(b.end).getTime(), t1);
        return `${formatInstant(s, timeZone)}–${formatInstant(e, timeZone)}`;
      })
      .join("; ");

    const freeStr =
      gaps.length === 0
        ? "(no free gaps — events cover the day)"
        : gaps
            .map(([a, b]) => `${formatInstant(a, timeZone)}–${formatInstant(b, timeZone)}`)
            .join("; ");

    lines.push(
      `- **${dayLabel}:** **Busy:** ${busyStr}. **Free:** ${freeStr}.`,
    );
  }

  const tomorrow = addDays(startOfDay(zNow), 1);
  const t0 = startOfDay(tomorrow).getTime();
  const t1 = endOfDay(tomorrow).getTime();
  const tomorrowBusy = busyIso.filter((b) => {
    const s = new Date(b.start).getTime();
    const e = new Date(b.end).getTime();
    return e > t0 && s < t1;
  });
  const tomorrowLabel = format(new TZDate(t0, timeZone), "EEEE, MMMM d, yyyy");

  if (tomorrowBusy.length > 0) {
    lines.push("");
    lines.push(
      `**If the user asks "when am I free tomorrow" (tomorrow = ${tomorrowLabel}):** you are **not** free all day — use the busy/free lines for that date above.`,
    );
  }

  return `\n${lines.join("\n")}\n`;
}
