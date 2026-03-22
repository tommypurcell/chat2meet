/**
 * Calendar date (YYYY-MM-DD) for an instant in an IANA timezone.
 * Use this instead of `toISOString().split("T")[0]` — ISO is always UTC, so "today"
 * in e.g. America/Los_Angeles can be wrong after ~5pm (next day in UTC).
 */
export function calendarDateInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  if (y && m && d) return `${y}-${m}-${d}`;
  return date.toISOString().split("T")[0];
}

/** Human-readable local time for agent prompts (includes zone abbrev e.g. PDT). */
export function formatLocalDateTimeForPrompt(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}
