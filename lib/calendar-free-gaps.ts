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
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(ms));
}

function formatDate(ms: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(ms));
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

  const lines: string[] = [];
  lines.push(
    `### Computed availability (${timeZone})`,
    `- Each **Busy** interval below means you are **not** free then.`,
    `- **Free** lists gaps inside that calendar day (midnight–midnight local).`,
    `- Do **not** say you are "free all day" if any busy interval exists that day.`,
    "",
  );

  // Use a simple loop for the next 8 days using standard Date
  const baseDate = new Date(nowMs);
  for (let d = 0; d < 8; d++) {
    const dayDate = new Date(baseDate);
    dayDate.setDate(baseDate.getDate() + d);
    dayDate.setHours(0, 0, 0, 0);
    const t0 = dayDate.getTime();
    dayDate.setHours(23, 59, 59, 999);
    const t1 = dayDate.getTime();

    const dayLabel = formatDate(t0, timeZone);
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
            .map(([start, end]) => `${formatInstant(start, timeZone)}–${formatInstant(end, timeZone)}`)
            .join("; ");

    lines.push(
      `- **${dayLabel}:** **Busy:** ${busyStr}. **Free:** ${freeStr}.`,
    );
  }

  return `\n${lines.join("\n")}\n`;
}
