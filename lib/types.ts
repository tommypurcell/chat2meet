/** Firestore Timestamp; at runtime use `Timestamp` from `firebase/firestore`. */
export type FirestoreTimestamp = {
  readonly seconds: number;
  readonly nanoseconds: number;
};

/** Date-only string (YYYY-MM-DD). */
export type ISODate = string;

/** ISO-8601 datetime string with offset. */
export type ISODateTime = string;

export type TimeRange = {
  start: ISODateTime;
  end: ISODateTime;
};

export type FreeWindow = TimeRange & {
  quality: "high" | "medium" | "low";
};

/** `users/{userId}` */
export type UserDoc = {
  name: string;
  email: string;
  photoUrl: string;
  timezone: string;
  calendarConnected: boolean;
  ghostMode: boolean;
  /** Google OAuth subject (`userinfo.id`) when the account was created via Google sign-in */
  googleSub?: string;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
};

/** `network/{ownerUserId}/{memberId}` */
export type NetworkConnectionDoc = {
  status: "pending" | "accepted" | "blocked";
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
};

export type SlotCandidate = {
  start: ISODateTime;
  end: ISODateTime;
  availableCount: number;
  score: number;
};

/** `events/{eventId}` */
export type EventDoc = {
  title: string;
  createdBy: string;
  participantIds: string[];
  dateRangeStart: ISODate;
  dateRangeEnd: ISODate;
  durationMinutes: number;
  timezone: string;
  status: "draft" | "active" | "finalized" | "cancelled";
  bestSlot: SlotCandidate | null;
  finalizedSlot: SlotCandidate | null;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
};

/** `events/{eventId}/participants/{userId}` */
export type EventParticipantDoc = {
  userId: string;
  name: string;
  email: string;
  photoUrl: string;
  role: "organizer" | "member";
  ghostMode: boolean;
  calendarConnected: boolean;
  joinedAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
};

/** `events/{eventId}/availability/{userId}` */
export type EventAvailabilityDoc = {
  userId: string;
  source: "google_calendar" | "manual" | "unknown";
  busyBlocks: TimeRange[];
  freeWindows: FreeWindow[];
  lastSyncedAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
};

// --- UI / mock (not Firestore) ---

export type ChatSuggestion = {
  title: string;
  body: string;
};

export type MeetingGroup = {
  id: string;
  name: string;
  members: string[];
  lastActive: string;
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
