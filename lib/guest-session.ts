"use client";

const GUEST_SESSION_KEY = "when2meet_guest_session";

export type GuestSession = {
  guestId: string;
  name: string;
  source: "agent";
  lastEventId?: string;
};

export function loadGuestSession(): GuestSession | null {
  try {
    const raw = localStorage.getItem(GUEST_SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<GuestSession>;
    if (
      typeof parsed?.guestId !== "string" ||
      typeof parsed?.name !== "string" ||
      parsed?.source !== "agent"
    ) {
      return null;
    }

    return {
      guestId: parsed.guestId,
      name: parsed.name,
      source: "agent",
      lastEventId: typeof parsed.lastEventId === "string" ? parsed.lastEventId : undefined,
    };
  } catch {
    return null;
  }
}

export function saveGuestSession(session: GuestSession): void {
  try {
    localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session));
  } catch {
    // Best-effort only.
  }
}

export function clearGuestSession(): void {
  try {
    localStorage.removeItem(GUEST_SESSION_KEY);
  } catch {
    // Best-effort only.
  }
}
