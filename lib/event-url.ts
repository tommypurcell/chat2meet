/**
 * Public URL for an event detail page (`/events/[id]`).
 * Uses NEXT_PUBLIC_APP_URL when set; otherwise localhost for dev.
 */
export function publicEventUrl(eventId: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  return `${base}/events/${eventId}`;
}
