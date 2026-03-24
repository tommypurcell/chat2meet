"use client";

const GUEST_SESSION_KEY = "when2meet_guest_sessions";

export type GuestSession = {
  eventId: string;
  guestId: string;
  name: string;
  source: "agent" | "manual";
};

type GuestSessionMap = Record<string, GuestSession>;

function loadGuestSessionMap(): GuestSessionMap {
  try {
    const raw = localStorage.getItem(GUEST_SESSION_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as Record<string, Partial<GuestSession>>;
    const sessions: GuestSessionMap = {};

    for (const [eventId, session] of Object.entries(parsed)) {
      if (
        typeof session?.eventId === "string" &&
        session.eventId === eventId &&
        typeof session?.guestId === "string" &&
        typeof session?.name === "string" &&
        (session?.source === "agent" || session?.source === "manual")
      ) {
        sessions[eventId] = {
          eventId,
          guestId: session.guestId,
          name: session.name,
          source: session.source,
        };
      }
    }

    return sessions;
  } catch {
    return {};
  }
}

function saveGuestSessionMap(sessions: GuestSessionMap): void {
  try {
    localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(sessions));
  } catch {
    // Best-effort only.
  }
}

export function loadGuestSession(eventId: string): GuestSession | null {
  return loadGuestSessionMap()[eventId] ?? null;
}

export function saveGuestSession(session: GuestSession): void {
  const sessions = loadGuestSessionMap();
  sessions[session.eventId] = session;
  saveGuestSessionMap(sessions);
}

export function clearGuestSession(eventId: string): void {
  const sessions = loadGuestSessionMap();
  delete sessions[eventId];
  saveGuestSessionMap(sessions);
}
