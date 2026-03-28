import { NextResponse } from "next/server";
import { collection } from "@/lib/api-helpers";
import { getSessionUserId } from "@/lib/auth-session";
import { getServerTimestamp } from "@/lib/firebase-admin";

const MAX_EVENTS = 500;

type IncomingEvent = Record<string, unknown>;

function sanitizeEvents(raw: unknown): Record<string, unknown>[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_EVENTS).map((e, i) => {
    if (typeof e !== "object" || e === null) {
      return { id: `row-${i}`, summary: "" };
    }
    const x = e as IncomingEvent;
    const attendees = Array.isArray(x.attendees)
      ? x.attendees.filter((a): a is string => typeof a === "string").slice(0, 100)
      : [];
    return {
      id: typeof x.id === "string" ? x.id : `row-${i}`,
      summary:
        typeof x.summary === "string" ? x.summary.slice(0, 500) : "No title",
      description:
        x.description === null || typeof x.description === "string"
          ? x.description
          : null,
      start:
        x.start === null || typeof x.start === "string" ? x.start : null,
      end: x.end === null || typeof x.end === "string" ? x.end : null,
      location:
        x.location === null || typeof x.location === "string"
          ? x.location
          : null,
      htmlLink: typeof x.htmlLink === "string" ? x.htmlLink : null,
      attendees,
    };
  });
}

/**
 * POST /api/calendars/sync
 * Saves a snapshot of Google Calendar events (from the client) under
 * `calendars/{sessionUserId}` for the signed-in user only.
 */
export async function POST(req: Request) {
  const sessionUid = await getSessionUserId();
  if (!sessionUid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const timeMin = typeof o.timeMin === "string" ? o.timeMin : "";
  const timeMax = typeof o.timeMax === "string" ? o.timeMax : "";
  const timezone =
    typeof o.timezone === "string" && o.timezone.trim()
      ? o.timezone.trim()
      : "America/Los_Angeles";
  const displayName =
    typeof o.displayName === "string" && o.displayName.trim()
      ? o.displayName.trim().slice(0, 200)
      : null;

  if (!Array.isArray(o.events)) {
    return NextResponse.json({ error: "events must be an array" }, { status: 400 });
  }
  if (o.events.length > MAX_EVENTS) {
    return NextResponse.json(
      { error: `At most ${MAX_EVENTS} events per sync` },
      { status: 400 },
    );
  }

  const events = sanitizeEvents(o.events);

  const ts = getServerTimestamp();
  await collection("calendars").doc(sessionUid).set(
    {
      userId: sessionUid,
      displayName,
      provider: "google",
      events,
      totalEvents: events.length,
      timeMin: timeMin || null,
      timeMax: timeMax || null,
      timezone,
      updatedAt: ts,
      lastSyncedAt: ts,
    },
    { merge: true },
  );

  return NextResponse.json({
    success: true,
    calendarId: sessionUid,
    totalEvents: events.length,
  });
}
