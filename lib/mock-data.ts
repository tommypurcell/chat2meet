import type {
  ChatSuggestion,
  EventItem,
  MeetingGroup,
  SchedulingEvent,
  ChatMessage,
  TimeSlot,
  MeetingInvite,
  CalendarEvent,
} from "./types";

export const CHAT_SUGGESTIONS: ChatSuggestion[] = [
  {
    title: "Pickleball again?",
    body: "Pete, Janet, Phil — this week sometime",
  },
  {
    title: "Coffee meeting?",
    body: "Catch up with Sarah over coffee",
  },
  {
    title: "Social lab zoom",
    body: "Set up recurring weekly for the group",
  },
  {
    title: "1:1 with Mike",
    body: "30 min check-in, mornings preferred",
  },
];

export const MEETING_GROUPS: MeetingGroup[] = [
  {
    id: "mg1",
    name: "Pickleball crew",
    members: ["Pete", "Janet", "Phil"],
    lastActive: "2 hours ago",
  },
  {
    id: "mg2",
    name: "Coffee w/ Sarah",
    members: ["Sarah"],
    lastActive: "Yesterday",
  },
  {
    id: "mg3",
    name: "Social Lab",
    members: ["Alex", "Jordan", "Casey", "Sam"],
    lastActive: "3 days ago",
  },
  {
    id: "mg4",
    name: "1:1 with Mike",
    members: ["Mike"],
    lastActive: "Last week",
  },
  {
    id: "mg5",
    name: "Design review",
    members: ["Rae", "Kim", "Lee", "Taylor"],
    lastActive: "Last week",
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
