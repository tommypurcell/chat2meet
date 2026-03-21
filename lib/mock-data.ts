import type { ChatSuggestion, EventItem, SchedulingEvent } from "./types";

export const CHAT_SUGGESTIONS: ChatSuggestion[] = [
  {
    title: "Find overlapping free slots",
    body: "Paste participant names or describe who needs to meet.",
  },
  {
    title: "Optimize for a specific window",
    body: "Prefer mornings PT, avoid Fridays, keep it under 45 minutes.",
  },
  {
    title: "Compare calendars politely",
    body: "Draft a message to collect availability without the grid UI.",
  },
  {
    title: "Resolve timezone confusion",
    body: "Translate proposed times for a distributed team.",
  },
];

export const RECENT_EVENTS: EventItem[] = [
  { id: "1", title: "Find meeting times for the team" },
  { id: "2", title: "Schedule across time zones" },
];

export const SAMPLE_SCHEDULING_EVENTS: SchedulingEvent[] = [
  {
    id: "e1",
    title: "Design review",
    description: "Pick a 45m slot next week, PT-friendly.",
    participantCount: 5,
    status: "collecting",
  },
  {
    id: "e2",
    title: "Intern onboarding",
    description: "First-week intro sessions across offices.",
    participantCount: 12,
    status: "ready",
  },
];
