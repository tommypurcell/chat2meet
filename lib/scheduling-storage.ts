import type { SchedulingParticipant } from "@/lib/types";

export const SCHEDULING_PARTICIPANTS_KEY = "schedulingParticipants";

export function loadSchedulingParticipants(): SchedulingParticipant[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(SCHEDULING_PARTICIPANTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SchedulingParticipant[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSchedulingParticipants(
  participants: SchedulingParticipant[],
): void {
  if (typeof window === "undefined") return;
  if (participants.length === 0) {
    sessionStorage.removeItem(SCHEDULING_PARTICIPANTS_KEY);
  } else {
    sessionStorage.setItem(
      SCHEDULING_PARTICIPANTS_KEY,
      JSON.stringify(participants),
    );
  }
}
