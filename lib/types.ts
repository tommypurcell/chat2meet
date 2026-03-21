export type ChatSuggestion = {
  title: string;
  body: string;
};

/** Sidebar “recent” row */
export type EventItem = {
  id: string;
  title: string;
};

export type EventStatus = "draft" | "collecting" | "ready";

/** Rich event card (scheduling poll / agent session) */
export type SchedulingEvent = {
  id: string;
  title: string;
  description?: string;
  participantCount: number;
  status: EventStatus;
};

export type MessageRole = "user" | "assistant";
