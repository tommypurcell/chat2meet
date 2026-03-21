export type ChatSuggestion = {
  title: string;
  body: string;
};

export type EventItem = {
  id: string;
  title: string;
};

export type EventStatus = "draft" | "collecting" | "ready";

export type SchedulingEvent = {
  id: string;
  title: string;
  description?: string;
  participantCount: number;
  status: EventStatus;
};

export type MessageRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  type?: "text" | "action";
};

export type TimeSlot = {
  id: string;
  time: string;
  date: string;
};

export type MeetingInvite = {
  id: string;
  title: string;
  organizer: string;
  time: string;
  date: string;
  location?: string;
  attendees: string[];
  status: "pending" | "accepted" | "declined" | "countered";
};

export type CalendarEvent = {
  id: string;
  title: string;
  time: string;
  color: "primary" | "warning" | "danger";
};

export type UserPreference = {
  noMeetingsBefore: string;
  noMeetingsAfter: string;
  maxMeetingLength: number;
  preferredDays: string[];
  visibility: "public" | "private";
};
