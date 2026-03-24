/** Deterministic kickoff for guest poll creation (structured agent flow). */
export const GUEST_CREATE_EVENT_MESSAGE =
  "I want to create a new scheduling poll with a shareable link. Please walk me through date range, times of day, meeting title, my availability, my name, and timezone.";

export type GuestQuickStart = {
  label: string;
  /** Short line shown on the card (like mock suggestion bodies). */
  subtitle: string;
  prompt: string;
};

export const GUEST_QUICK_STARTS: GuestQuickStart[] = [
  {
    label: "Team meeting",
    subtitle: "Next week · 30 minutes",
    prompt:
      "Create a meeting poll for a team meeting next week. Duration 30 minutes.",
  },
  {
    label: "1:1",
    subtitle: "30 min · morning options",
    prompt: "Create a 30-minute 1:1 poll with morning options.",
  },
  {
    label: "Coffee chat",
    subtitle: "Sometime this week",
    prompt: "Help me schedule a coffee chat sometime this week.",
  },
  {
    label: "Study group",
    subtitle: "Evening availability",
    prompt: "Make a poll for a study group with evening availability.",
  },
  {
    label: "Dinner plans",
    subtitle: "Group · this weekend",
    prompt:
      "Help me find a dinner time that works for a group this weekend.",
  },
  {
    label: "Interview",
    subtitle: "Time options for a candidate",
    prompt: "Create interview time options for a candidate.",
  },
];
