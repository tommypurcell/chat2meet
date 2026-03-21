import type {
  ChatSuggestion,
  EventItem,
  SchedulingEvent,
  ChatMessage,
  TimeSlot,
  MeetingInvite,
  CalendarEvent,
} from "./types";

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
  { id: "1", title: "Coffee with Sarah" },
  { id: "2", title: "Team standup" },
  { id: "3", title: "Design review" },
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

export const SAMPLE_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: "m1",
    role: "user",
    content: "I want to grab coffee with Sarah this week",
  },
  {
    id: "m2",
    role: "assistant",
    content:
      "I checked both calendars. Sarah is free Tuesday 2-3 PM and Wednesday 10-11 AM. Which works better?",
  },
];

export const SAMPLE_TIME_SLOTS: TimeSlot[] = [
  { id: "ts1", time: "2:00 PM", date: "Tue Mar 25" },
  { id: "ts2", time: "10:00 AM", date: "Wed Mar 26" },
  { id: "ts3", time: "4:30 PM", date: "Thu Mar 27" },
];

export const SAMPLE_INVITE: MeetingInvite = {
  id: "inv1",
  title: "Coffee chat",
  organizer: "Rae",
  time: "2:00 – 2:30 PM",
  date: "Tuesday, March 25",
  location: "Blue Bottle Coffee",
  attendees: ["Rae", "Sarah"],
  status: "pending",
};

export const SAMPLE_CALENDAR_EVENTS: CalendarEvent[] = [
  { id: "ce1", title: "Team standup", time: "10:00 – 10:30 AM", color: "primary" },
  { id: "ce2", title: "Coffee w/ Sarah", time: "2:00 – 2:30 PM", color: "warning" },
  { id: "ce3", title: "Design review", time: "4:00 – 4:45 PM", color: "primary" },
];

export const WEEK_DAYS = ["S", "M", "T", "W", "T", "F", "S"] as const;

export const MARCH_DATES = [
  { day: 16, events: false },
  { day: 17, events: false },
  { day: 18, events: true },
  { day: 19, events: false },
  { day: 20, events: true },
  { day: 21, events: true },
  { day: 22, events: false },
  { day: 23, events: true },
  { day: 24, events: false },
  { day: 25, events: true },
  { day: 26, events: false },
  { day: 27, events: true },
  { day: 28, events: false },
];
