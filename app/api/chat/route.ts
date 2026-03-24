import { google } from "@ai-sdk/google";
import { streamText, tool, convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import { z } from "zod";
import { google as googleApis } from "googleapis";
import { decrypt, encrypt } from "@/lib/encryption";
import { collection, timestamps } from "@/lib/api-helpers";
import {
  eventsToBusyBlocks,
  calculateFreeWindows,
  findCommonFreeSlots,
} from "@/lib/calendar-utils";
import { createCalendarEvent } from "@/lib/google-calendar";
import type { SchedulingParticipant } from "@/lib/types";
import { getSessionUserId } from "@/lib/auth-session";
import { defaultDevUserId } from "@/lib/dev-user-ids";
import { AGENT_PLAIN_TEXT_OUTPUT_RULES } from "@/lib/agent-plain-text-prompt";
import {
  formatCalendarEventsForPrompt,
  formatCalendarLoadErrorPrompt,
  formatMockNetworkCalendarsForPrompt,
  formatNoCalendarConnectedPrompt,
} from "@/lib/format-calendar-for-prompt";
import { MOCK_CONNECTIONS } from "@/lib/data";
import {
  effectiveMockQueryRange,
  getMockFilteredEventsForTool,
  mockEventsToBusyBlocks,
  resolveMockCalendarId,
} from "@/lib/mock-calendar-agent";
import {
  calendarDateInTimeZone,
  formatLocalDateTimeForPrompt,
} from "@/lib/date-in-timezone";
import { publicEventUrl } from "@/lib/event-url";
import { defaultEventTimeSlotLabels } from "@/lib/event-grid-slots";
import { inferAvailabilityBoundsFromSlots, parseAvailability } from "@/lib/parse-availability";

type CellKey = `${number}-${number}`;

function extractEventIdFromInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const match = url.pathname.match(/\/events\/([^/?#]+)/);
    if (match?.[1]) return match[1];
  } catch {
    // Not a URL; continue.
  }

  const pathMatch = trimmed.match(/\/events\/([^/?#]+)/);
  if (pathMatch?.[1]) return pathMatch[1];

  if (/^[A-Za-z0-9_-]{8,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

function eventDateStringsBetween(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(`${start}T12:00:00`);
  const endDate = new Date(`${end}T12:00:00`);

  while (current <= endDate) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function formatEventDayLabel(dateString: string): string {
  return new Date(`${dateString}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function inferParticipantName(userId: string): string {
  if (userId.startsWith("guest_")) {
    return userId.replace("guest_", "").replace(/_/g, " ");
  }
  return userId;
}

async function buildEventPollSnapshot(eventIdOrUrl: string) {
  const eventId = extractEventIdFromInput(eventIdOrUrl);
  if (!eventId) {
    throw new Error("Could not find an event id in that link or text.");
  }

  const eventRef = collection("events").doc(eventId);
  const eventSnap = await eventRef.get();
  if (!eventSnap.exists) {
    throw new Error(`Event ${eventId} was not found.`);
  }

  const event = eventSnap.data() as {
    title?: string;
    createdBy?: string;
    creatorName?: string;
    participantIds?: string[];
    dateRangeStart: string;
    dateRangeEnd: string;
    durationMinutes?: number;
    timezone?: string;
    earliestTime?: string;
    latestTime?: string;
    shareUrl?: string;
    status?: string;
  };

  const [participantsSnapshot, availabilitySnapshot] = await Promise.all([
    eventRef.collection("participants").get(),
    eventRef.collection("availability").get(),
  ]);

  const participantNameById = new Map<string, string>();

  participantsSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    const explicitUserId =
      typeof data.userId === "string" && data.userId.trim() ? data.userId.trim() : doc.id;
    const name =
      typeof data.name === "string" && data.name.trim()
        ? data.name.trim()
        : inferParticipantName(explicitUserId);
    participantNameById.set(explicitUserId, name);
  });

  if (event.createdBy) {
    participantNameById.set(
      event.createdBy,
      event.creatorName?.trim() || participantNameById.get(event.createdBy) || inferParticipantName(event.createdBy),
    );
  }

  const availabilityByUserId = new Map<string, Set<CellKey>>();
  availabilitySnapshot.docs.forEach((doc) => {
    const data = doc.data();
    const slots = Array.isArray(data?.slots)
      ? data.slots.filter((slot): slot is CellKey => typeof slot === "string")
      : [];
    availabilityByUserId.set(doc.id, new Set(slots));

    if (!participantNameById.has(doc.id)) {
      participantNameById.set(doc.id, inferParticipantName(doc.id));
    }
  });

  const participantIds = Array.from(
    new Set([
      ...((Array.isArray(event.participantIds) ? event.participantIds : []).filter(
        (id): id is string => typeof id === "string" && id.length > 0,
      )),
      ...(event.createdBy ? [event.createdBy] : []),
      ...participantsSnapshot.docs.map((doc) => doc.id),
      ...availabilitySnapshot.docs.map((doc) => doc.id),
    ]),
  );

  const dateStrings = eventDateStringsBetween(event.dateRangeStart, event.dateRangeEnd);
  const earliestSlotIdx = event.earliestTime
    ? Math.max(0, Math.floor((Number(event.earliestTime.split(":")[0]) - 9) * 2 + Number(event.earliestTime.split(":")[1] || "0") / 30))
    : 0;
  const latestSlotIdx = event.latestTime
    ? Math.max(earliestSlotIdx, Math.floor((Number(event.latestTime.split(":")[0]) - 9) * 2 + Number(event.latestTime.split(":")[1] || "0") / 30) - 1)
    : 16;
  const timeLabels = defaultEventTimeSlotLabels(earliestSlotIdx, latestSlotIdx);

  const rankedSlots = dateStrings.flatMap((dateString, dayIdx) =>
    timeLabels.map((time, visibleSlotIdx) => {
      const slotIdx = earliestSlotIdx + visibleSlotIdx;
      const key: CellKey = `${dayIdx}-${slotIdx}`;
      const availableUsers = participantIds
        .filter((userId) => availabilityByUserId.get(userId)?.has(key))
        .map((userId) => participantNameById.get(userId) || inferParticipantName(userId));
      const unavailableUsers = participantIds
        .filter((userId) => !availabilityByUserId.get(userId)?.has(key))
        .map((userId) => participantNameById.get(userId) || inferParticipantName(userId));
      const availableCount = availableUsers.length;
      const totalParticipants = participantIds.length;

      return {
        slotKey: key,
        dayIdx,
        slotIdx,
        date: dateString,
        dateLabel: formatEventDayLabel(dateString),
        time,
        availableCount,
        totalParticipants,
        score: totalParticipants > 0 ? availableCount / totalParticipants : 0,
        availableUsers,
        unavailableUsers,
      };
    }),
  );

  rankedSlots.sort((a, b) => {
    if (b.availableCount !== a.availableCount) return b.availableCount - a.availableCount;
    if (b.score !== a.score) return b.score - a.score;
    if (a.dayIdx !== b.dayIdx) return a.dayIdx - b.dayIdx;
    return a.slotIdx - b.slotIdx;
  });

  const everyoneAvailableSlots = rankedSlots.filter(
    (slot) => slot.totalParticipants > 0 && slot.availableCount === slot.totalParticipants,
  );

  const participantSummaries = participantIds.map((userId) => {
    const slots = availabilityByUserId.get(userId);
    return {
      userId,
      name: participantNameById.get(userId) || inferParticipantName(userId),
      hasAvailability: Boolean(slots && slots.size > 0),
      slotCount: slots?.size ?? 0,
    };
  });

  const missingResponders = participantSummaries
    .filter((participant) => !participant.hasAvailability)
    .map((participant) => participant.name);

  const topSlots = rankedSlots.slice(0, 5);
  const summaryLines = [
    `Event: ${event.title || "Untitled event"}`,
    `Range: ${event.dateRangeStart} to ${event.dateRangeEnd} (${event.timezone || "America/Los_Angeles"})`,
    `Participants: ${participantSummaries.map((p) => p.name).join(", ") || "none yet"}`,
    everyoneAvailableSlots.length > 0
      ? `Everyone is available in ${everyoneAvailableSlots.length} slot(s). Best: ${everyoneAvailableSlots
          .slice(0, 3)
          .map((slot) => `${slot.dateLabel} at ${slot.time}`)
          .join(", ")}`
      : topSlots.length > 0
        ? `No slot fits everyone yet. Best partial overlap: ${topSlots[0].dateLabel} at ${topSlots[0].time} (${topSlots[0].availableCount}/${topSlots[0].totalParticipants} available)`
        : "No availability has been added yet.",
    missingResponders.length > 0
      ? `Still missing: ${missingResponders.join(", ")}`
      : "Everyone on the poll has added some availability.",
  ];

  return {
    eventId,
    event: {
      title: event.title || "Untitled event",
      dateRangeStart: event.dateRangeStart,
      dateRangeEnd: event.dateRangeEnd,
      timezone: event.timezone || "America/Los_Angeles",
      durationMinutes: event.durationMinutes || 60,
      earliestTime: event.earliestTime || "09:00",
      latestTime: event.latestTime || "17:00",
      status: event.status || "active",
      shareUrl: event.shareUrl || publicEventUrl(eventId),
    },
    participants: participantSummaries,
    missingResponders,
    gridSlots: rankedSlots.map((slot) => ({
      dayIdx: slot.dayIdx,
      slotIdx: slot.slotIdx,
      date: slot.date,
      dateLabel: slot.dateLabel,
      time: slot.time,
      availableCount: slot.availableCount,
      totalParticipants: slot.totalParticipants,
      score: slot.score,
      availableUsers: slot.availableUsers,
      unavailableUsers: slot.unavailableUsers,
    })),
    everyoneAvailableSlots: everyoneAvailableSlots.slice(0, 10),
    topSlots,
    summary: summaryLines.join("\n"),
  };
}

function parseSchedulingParticipants(raw: unknown): SchedulingParticipant[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (p): p is Record<string, unknown> =>
        typeof p === "object" && p !== null && typeof p.memberUserId === "string",
    )
    .map((p) => ({
      memberUserId: p.memberUserId as string,
      memberName: typeof p.memberName === "string" ? p.memberName : "",
      memberEmail: typeof p.memberEmail === "string" ? p.memberEmail : "",
    }));
}

function buildRelativeDatePromptSection(
  timeZone: string,
  localDate: string,
  localDateTime: string,
  opts?: { requireConfirmationForRelativeDates?: boolean },
): string {
  const requireConfirmation = opts?.requireConfirmationForRelativeDates ?? false;

  return `## Relative Dates And Timezones
- The current assumed timezone is ${timeZone}.
- The current local calendar date in that timezone is ${localDate}.
- The current local time in that timezone is ${localDateTime}.
- Interpret words like "today", "tomorrow", "tmrw", "this weekend", "next Monday", and "after work" using this local date/time context, never UTC.
- If the timezone/date context is known and reliable, you may answer relative-date questions using it directly.
${requireConfirmation
    ? `- If the user uses a relative date before they have clearly confirmed the timezone context, pause and confirm it instead of guessing. Ask something short like: "Just to confirm, should I treat today as ${localDate} in ${timeZone}?"`
    : `- If the user seems confused about relative dates or the timezone context may be wrong, briefly restate the exact date and timezone before proceeding.`}
`;
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    messages?: UIMessage[];
    schedulingParticipants?: unknown;
    currentUserId?: string;
    /** IANA zone from the browser (e.g. America/Los_Angeles) — used for "today" in the prompt. */
    userTimezone?: string;
    /** Preformatted markdown from the client (same data as GET /api/calendar/google/events). */
    calendarContext?: string;
  };
  const messages = body.messages ?? [];

  // Session cookie is authoritative when present. Otherwise use `currentUserId` from the client
  // body (same uid as `/api/auth/me`) so the calendar block matches the user whose events you see
  // in the browser — fetch to `/api/chat` must send `credentials: "include"` from the client.
  const sessionUserId = await getSessionUserId();
  const fromBody =
    typeof body.currentUserId === "string" ? body.currentUserId.trim() : "";

  let currentUserId: string;
  let calendarUserIdSource: "session" | "body" | "dev";

  if (sessionUserId) {
    currentUserId = sessionUserId;
    calendarUserIdSource = "session";
    if (fromBody && fromBody !== sessionUserId) {
      console.warn(
        "[Chat API] body.currentUserId does not match session; using session uid",
      );
    }
  } else if (fromBody) {
    currentUserId = fromBody;
    calendarUserIdSource = "body";
  } else {
    currentUserId = defaultDevUserId();
    calendarUserIdSource = "dev";
  }

  console.log(
    "[Chat API] currentUserId:",
    currentUserId,
    "source:",
    calendarUserIdSource,
  );

  const schedulingParticipants = parseSchedulingParticipants(
    body.schedulingParticipants,
  );

  let userTimeZone = "America/Los_Angeles";
  const tzFromClient =
    typeof body.userTimezone === "string" ? body.userTimezone.trim() : "";
  if (tzFromClient) {
    userTimeZone = tzFromClient;
  } else {
    try {
      const userSnap = await collection("users").doc(currentUserId).get();
      const t = userSnap.data()?.timezone;
      if (typeof t === "string" && t.trim()) userTimeZone = t.trim();
    } catch {
      /* keep default */
    }
  }

  const clientCalendar =
    typeof body.calendarContext === "string" ? body.calendarContext.trim() : "";

  const promptNow = new Date();
  const promptLocalDate = calendarDateInTimeZone(promptNow, userTimeZone);
  const promptLocalDateTime = formatLocalDateTimeForPrompt(promptNow, userTimeZone);

  // Prefer the same preformatted block the browser already built from GET /api/calendar/google/events
  // so the agent always matches what you see in devtools. Fallback: fetch on the server.
  let userCalendarData = "";
  if (clientCalendar) {
    userCalendarData = clientCalendar;
    console.log(
      "[Chat API] calendar prompt: using client calendarContext,",
      clientCalendar.length,
      "chars",
    );
  } else {
    try {
      if (currentUserId) {
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const accountsSnapshot = await collection("users")
          .doc(currentUserId)
          .collection("calendarAccounts")
          .where("provider", "==", "google")
          .where("isActive", "==", true)
          .limit(1)
          .get();

        if (accountsSnapshot.empty) {
          userCalendarData = formatNoCalendarConnectedPrompt(currentUserId);
        } else {
          const accountDoc = accountsSnapshot.docs[0];
          const accountData = accountDoc.data();

          const accessToken = decrypt(accountData.accessToken);
          const refreshToken = accountData.refreshToken
            ? decrypt(accountData.refreshToken)
            : null;

          const oauth2Client = new googleApis.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.OAUTH_REDIRECT_URI
          );

          oauth2Client.setCredentials({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          const tokenExpiresAt = accountData.tokenExpiresAt?.toDate();
          if (tokenExpiresAt && tokenExpiresAt <= new Date() && refreshToken) {
            const { credentials } = await oauth2Client.refreshAccessToken();
            const ts = timestamps();
            await collection("users")
              .doc(currentUserId)
              .collection("calendarAccounts")
              .doc(accountDoc.id)
              .update({
                accessToken: credentials.access_token
                  ? encrypt(credentials.access_token)
                  : accountData.accessToken,
                tokenExpiresAt: credentials.expiry_date
                  ? new Date(credentials.expiry_date)
                  : null,
                updatedAt: ts.updatedAt,
              });
          }

          const calendar = googleApis.calendar({ version: "v3", auth: oauth2Client });

          const response = await calendar.events.list({
            calendarId: "primary",
            timeMin: now.toISOString(),
            timeMax: nextWeek.toISOString(),
            maxResults: 50,
            singleEvents: true,
            orderBy: "startTime",
          });

          const events = response.data.items || [];

          console.log(
            "[Chat API] server calendar fetch:",
            events.length,
            "events (user:",
            currentUserId,
            ")",
          );

          const rangeLabel = `${calendarDateInTimeZone(now, userTimeZone)} → ${calendarDateInTimeZone(nextWeek, userTimeZone)}`;

          const mapped = events
            .filter((e) => e.start?.dateTime)
            .map((e) => ({
              summary: e.summary,
              start: e.start!.dateTime!,
              end: e.end?.dateTime,
            }));

          userCalendarData = formatCalendarEventsForPrompt(
            currentUserId,
            mapped,
            `next 7 days (${rangeLabel})`,
            userTimeZone,
          );
        }
      } else {
        userCalendarData = `

## User's Google Calendar
No user id in session — cannot load calendar.`;
      }
    } catch (error) {
      console.error("[Chat API] Error fetching calendar for system prompt:", error);
      userCalendarData = formatCalendarLoadErrorPrompt(
        error instanceof Error ? error.message : "unknown error",
      );
    }
  }

  console.log(
    "[Chat API] System prompt calendar section length:",
    userCalendarData.length,
    "chars",
  );

  const mockNetworkCalendarsBlock = formatMockNetworkCalendarsForPrompt(
    userTimeZone,
    Date.now(),
    { omitUserIds: [] },
  );

  const schedulingBlock =
    schedulingParticipants.length > 0
      ? `

## People to schedule with (from the user's network — do not ask for user IDs)
The user already chose who is in this meeting:
${schedulingParticipants.map((p) => `- ${p.memberName || "Contact"} (${p.memberEmail}) → \`userId\` for tools: \`${p.memberUserId}\``).join("\n")}

Rules:
- Do not ask the user to provide user IDs or technical identifiers.
- For getSchedule, pass each person's \`memberUserId\` as the \`userId\` argument.
- For findOverlap, set \`userIds\` to the memberUserId values for everyone in this meeting (use the list above). If you call findOverlap with an empty userIds array, the server will use this list.
- For getFriends, the list above is authoritative — do not ask the user to name people unless they want to add someone new.
`
      : "";

  // Check if user is logged in
  const isLoggedIn = sessionUserId !== null;

  const systemPrompt = isLoggedIn
    ? `You are Chat2Meet Agent, a smart scheduling assistant.
Help users find times to meet with their friends and colleagues.

## Current User
The logged-in user's ID is: ${currentUserId ?? "(unknown)"}

IMPORTANT: The user's local timezone is ${userTimeZone}. Local calendar date (not UTC): ${calendarDateInTimeZone(new Date(), userTimeZone)}. Local time now: ${formatLocalDateTimeForPrompt(new Date(), userTimeZone)}. Use this local date for "today", "this week", and similar — do not infer the calendar day from UTC.

${buildRelativeDatePromptSection(userTimeZone, promptLocalDate, promptLocalDateTime)}

${userCalendarData}
${mockNetworkCalendarsBlock}

## Response Style
- **CRITICAL**: Keep ALL responses SHORT and conversational (1-3 sentences max)
- Write like texting a friend, not writing an email
- Be direct and helpful, not verbose or flowery
- On first message, introduce yourself in ONE sentence

## How to Schedule
- For the **current user's** schedule in the next ~7 days, rely on the **User's Google Calendar** and **Computed availability** sections above when present
- **"When am I free?"** Use the **Free** gaps in **Computed availability** (timezone shown there). Never say you are "free all day" on a day that has any **Busy** interval or timed event. Do not invent free time inside a busy block.
- For **Janet, Pete, Phil**, and other people in **Demo network calendars**, use the schedules above or call \`getSchedule\` / \`findOverlap\` with ids \`janet\`, \`pete\`, \`phil\` (or legacy \`user_janet\`, etc. — both work). Demo event dates are **Mar 15–29, 2026** (\`America/Los_Angeles\`).
- When a user mentions meeting with someone specific, use your tools to find overlapping free times and suggest specific times
- If the user pastes an event poll link or event id and asks about that poll, call \`getEventPoll\` before answering questions about availability, missing responders, or best times
- If the user wants to visually inspect an event poll in chat, call \`showEventPoll\` with the event link or id after you understand which poll they mean
- Call suggestTimes when you find good meeting times to display them interactively
- You can create events on the user's Google Calendar with the \`createEvent\` tool
- **NEVER call createEvent without the user's explicit confirmation.** Always summarise the event (title, date/time, attendees) and ask "Should I create this?" first.
- After creating an event, tell the user it was added and include the Google Calendar link from the result
${schedulingBlock}
${AGENT_PLAIN_TEXT_OUTPUT_RULES}`
    : `You are Chat2Meet Agent helping someone create a scheduling poll (like When2Meet).

## Guests only (no one is logged in — there is no session)

${buildRelativeDatePromptSection(userTimeZone, promptLocalDate, promptLocalDateTime, {
  requireConfirmationForRelativeDates: true,
})}

Follow this order. Ask **one short question at a time** (1–2 sentences). Wait for an answer before the next step.
If they already gave information in an earlier message, do not ask for it again. Acknowledge what you captured and only ask for what is still missing, **in this order**.
If they answered multiple steps across multiple messages, reuse those answers.
If they say "yes" to a timezone/date confirmation question, treat that timezone/date context as confirmed and do not ask for timezone again unless they later change it.
If you need to confirm a relative date/timezone assumption, send only that confirmation question in its own message. Do not combine it with the next scheduling question.
If a message starts with "Just to confirm..." or any timezone/date confirmation, that message must contain only the confirmation. No second sentence asking for dates, availability, title, or anything else.

**1) Date window**
First, make sure the date window is clear enough to build the poll.
If they already said something clear like "tomorrow", "next week", "this weekend", or a specific date range, do not ask for dates again.
Only ask for dates if the window is still unclear.

**2) Availability / time windows**
Once the date window is clear, ask about their availability next.
If they said "next week", your next question should be about time windows, for example: "What times are you available next week? For example, 10 AM-3 PM or 9 AM-5 PM."
Ask about availability before title or name.

**3) Confirm whether it applies to all days — only if needed**
If they give a time range but it is unclear whether it applies to every day in the window, ask one short follow-up like: "Is that the same availability for all days next week?"
Do not ask this if they already made it clear.

**4) Meeting title**
Ask: What should we call this meeting?

**5) Their name**
Ask: What name should show on the poll for you?

**6) Timezone — last before creating**
Ask: What timezone should we use for this poll? (e.g. America/Los_Angeles, or "Pacific".)
Skip this question if the timezone was already confirmed earlier in the conversation.
Do **not** call createGuestEvent until you have a clear timezone (or a common zone name you can map).

**7) Create the poll**
When you have: dates/window, their availability text (including any earliest/latest limits), title, their name, and timezone → call **createGuestEvent**.
For recurring or "every Monday" style answers, turn the next few occurrences into concrete dateRangeStart / dateRangeEnd for the tool.
Pass earliestTime / latestTime from their constraints when they gave bounds (e.g. 9:00 and 17:00).

Then send one short final confirmation only, with wording like: "Your poll for Team meet is ready below."
Do not paste the raw share URL in the text reply if the chat already shows the poll card.
Do not add a sign-up prompt in the same success message.
Immediately after createGuestEvent succeeds, call **showEventPoll** with the new event id so the poll card / heatmap appears in chat before your final text reply.

**Critical rules**
- This strict When2Meet-style order applies only in guest mode (no logged-in user).
- Keep every reply SHORT and plain (see OUTPUT FORMAT below).
- Never mention "/network" or "Scheduling with" (those are for logged-in users only).
- Do not use getSchedule, findOverlap, or createEvent for Google Calendar in guest mode unless the user logs in; focus on createGuestEvent for the poll.
- If the user pastes a poll link or event id and asks about that poll, call \`getEventPoll\` to inspect the existing event before answering.
- If the user wants to see the poll/grid in chat, call \`showEventPoll\` with the event link or id.

${AGENT_PLAIN_TEXT_OUTPUT_RULES}`;

  console.log("=== AGENT INPUT (System Prompt) ===");
  console.log(systemPrompt);
  console.log("=== AGENT INPUT (Messages) ===");
  console.log(JSON.stringify(messages, null, 2));

  const result = streamText({
    model: google("gemini-3-flash-preview"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    onStepFinish({ text, toolCalls, toolResults, finishReason, usage }) {
      console.log("=== AGENT STEP FINISH ===");
      console.log("Text Output:", text);
      console.log("Tool Calls:", JSON.stringify(toolCalls, null, 2));
      console.log("Tool Results:", JSON.stringify(toolResults, null, 2));
      console.log("Finish Reason:", finishReason);
      console.log("Usage:", JSON.stringify(usage));
    },
    onFinish({ text, finishReason, usage }) {
      console.log("=== AGENT STREAM FINISH ===");
      console.log("Final Text Output:", text);
      console.log("Finish Reason:", finishReason);
      console.log("Total Usage:", JSON.stringify(usage));
    },
    tools: {
      suggestTimes: tool({
        description:
          "Show suggested meeting times to the user when you've found good options",
        inputSchema: z.object({
          times: z
            .array(
              z.object({
                id: z.string(),
                time: z.string().describe("Time in HH:MM AM/PM format"),
                date: z.string().describe("Date with day of week (e.g. 'Mon Mar 25')"),
              })
            )
            .describe("Array of suggested time slots"),
          message: z
            .string()
            .describe("Brief plain-text message (no Markdown) explaining why these times work"),
        }),
        execute: async ({ times, message }) => {
          console.log("=== TOOL: suggestTimes ===");
          console.log("Times:", times);
          console.log("Message:", message);
          return {
            suggestedTimes: times,
            explanation: message,
          };
        },
      }),

      getFriends: tool({
        description: "Get the current user's list of friends and contacts",
        inputSchema: z.object({}),
        execute: async () => {
          console.log("=== TOOL: getFriends ===");
          const friends = schedulingParticipants.length > 0
            ? schedulingParticipants.map((p) => ({
                id: p.memberUserId,
                name: p.memberName || "Contact",
                email: p.memberEmail,
              }))
            : MOCK_CONNECTIONS.map((c) => ({
                id: c.userId,
                name: c.name,
                email: c.email,
              }));
          console.log("Returning friends:", friends);
          return friends;
        },
      }),

      getEventPoll: tool({
        description:
          "Fetch an existing event poll by event id or pasted /events/... link, including participant availability, top overlap slots, and missing responders.",
        inputSchema: z.object({
          eventIdOrUrl: z
            .string()
            .describe("An event id like h1nRwE6n4aN9mFXgxJFn or a full event link like http://localhost:3000/events/h1nRwE6n4aN9mFXgxJFn"),
        }),
        execute: async ({ eventIdOrUrl }) => {
          try {
            console.log("=== TOOL: getEventPoll ===");
            console.log("Input:", eventIdOrUrl);

            const result = await buildEventPollSnapshot(eventIdOrUrl);

            console.log("=== TOOL RESULT: getEventPoll ===");
            console.log(JSON.stringify(result, null, 2));

            return result;
          } catch (error) {
            console.error("Error fetching event poll:", error);
            return {
              error: error instanceof Error ? error.message : "Failed to load event poll",
            };
          }
        },
      }),

      showEventPoll: tool({
        description:
          "Show an existing event poll as an in-chat card with the overlap grid, top slots, and missing responders.",
        inputSchema: z.object({
          eventIdOrUrl: z
            .string()
            .describe("An event id or full /events/... link for the poll to show in chat"),
        }),
        execute: async ({ eventIdOrUrl }) => {
          try {
            console.log("=== TOOL: showEventPoll ===");
            console.log("Input:", eventIdOrUrl);

            const snapshot = await buildEventPollSnapshot(eventIdOrUrl);
            return {
              success: true,
              ...snapshot,
            };
          } catch (error) {
            console.error("Error building in-chat event poll:", error);
            return {
              success: false,
              error: error instanceof Error ? error.message : "Failed to show event poll",
            };
          }
        },
      }),

      getSchedule: tool({
        description:
          "Get calendar events and busy blocks for a date range. For demo people use ids like janet, pete, phil, tommy (or user_janet, etc.). Otherwise uses Google Calendar when connected.",
        inputSchema: z.object({
          userId: z.string().describe("User id: e.g. janet, user_janet, or a real Firebase uid"),
          startDate: z.string().describe("Start date in YYYY-MM-DD format"),
          endDate: z.string().describe("End date in YYYY-MM-DD format"),
        }),
        execute: async ({ userId, startDate, endDate }) => {
          try {
            console.log("[getSchedule] Fetching calendar for userId:", userId);
            console.log("[getSchedule] Date range:", startDate, "to", endDate);

            if (resolveMockCalendarId(userId)) {
              const {
                canonicalId,
                events: inRange,
                note,
                usedDemoDateFallback,
              } = getMockFilteredEventsForTool(userId, startDate, endDate);
              const busyBlocks = mockEventsToBusyBlocks(inRange);
              const eventSummaries = inRange.map((e) => ({
                title: e.title || "Busy",
                start: e.start,
                end: e.end,
              }));
              return {
                userId: canonicalId,
                queriedAs: userId,
                events: eventSummaries,
                busyBlocks,
                totalEvents: inRange.length,
                source: "mock",
                message: note,
                usedDemoDateFallback,
              };
            }

            // Get calendar account
            const accountsSnapshot = await collection("users")
              .doc(userId)
              .collection("calendarAccounts")
              .where("provider", "==", "google")
              .where("isActive", "==", true)
              .limit(1)
              .get();

            console.log("[getSchedule] Found calendar accounts:", accountsSnapshot.size);

            if (accountsSnapshot.empty) {
              console.log("[getSchedule] No calendar connected for user:", userId);
              return {
                userId,
                events: [],
                busyBlocks: [],
                message: "No calendar connected - user appears to be free",
              };
            }

            const accountDoc = accountsSnapshot.docs[0];
            const accountData = accountDoc.data();

            // Decrypt tokens
            const accessToken = decrypt(accountData.accessToken);
            const refreshToken = accountData.refreshToken
              ? decrypt(accountData.refreshToken)
              : null;

            // Set up OAuth client
            const oauth2Client = new googleApis.auth.OAuth2(
              process.env.GOOGLE_CLIENT_ID,
              process.env.GOOGLE_CLIENT_SECRET,
              process.env.OAUTH_REDIRECT_URI
            );

            oauth2Client.setCredentials({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            // Check if token needs refresh
            const tokenExpiresAt = accountData.tokenExpiresAt?.toDate();
            if (tokenExpiresAt && tokenExpiresAt <= new Date()) {
              if (!refreshToken) {
                return {
                  userId,
                  events: [],
                  error: "Calendar token expired",
                };
              }

              const { credentials } = await oauth2Client.refreshAccessToken();

              const ts = timestamps();
              await collection("users")
                .doc(userId)
                .collection("calendarAccounts")
                .doc(accountDoc.id)
                .update({
                  accessToken: credentials.access_token
                    ? encrypt(credentials.access_token)
                    : accountData.accessToken,
                  tokenExpiresAt: credentials.expiry_date
                    ? new Date(credentials.expiry_date)
                    : null,
                  updatedAt: ts.updatedAt,
                });
            }

            // Fetch events from Google Calendar
            const calendar = googleApis.calendar({ version: "v3", auth: oauth2Client });

            const rangeStart = new Date(startDate);
            const rangeEnd = new Date(endDate);

            const response = await calendar.events.list({
              calendarId: "primary",
              timeMin: rangeStart.toISOString(),
              timeMax: rangeEnd.toISOString(),
              maxResults: 250,
              singleEvents: true,
              orderBy: "startTime",
            });

            const events = response.data.items || [];

            console.log("[getSchedule] Fetched events from Google Calendar:", events.length);
            console.log("[getSchedule] Sample events:", events.slice(0, 3).map(e => ({
              summary: e.summary,
              start: e.start?.dateTime || e.start?.date,
              end: e.end?.dateTime || e.end?.date
            })));

            // Convert to busy blocks for agent
            const busyBlocks = eventsToBusyBlocks(events);

            // Summarize events for agent
            const eventSummaries = events
              .filter((e) => e.start?.dateTime)
              .map((e) => ({
                title: e.summary || "Busy",
                start: e.start?.dateTime,
                end: e.end?.dateTime,
              }));

            console.log("[getSchedule] Returning event summaries:", eventSummaries.length);
            console.log("[getSchedule] Busy blocks:", busyBlocks.length);

            const result = {
              userId,
              events: eventSummaries,
              busyBlocks,
              totalEvents: events.length,
            };

            console.log("=== TOOL RESULT: getSchedule ===");
            console.log(JSON.stringify(result, null, 2));

            return result;
          } catch (error) {
            console.error(`Error fetching schedule for ${userId}:`, error);
            const errorResult = {
              userId,
              events: [],
              error: error instanceof Error ? error.message : "Unknown error",
            };
            console.log("=== TOOL ERROR: getSchedule ===");
            console.log(JSON.stringify(errorResult, null, 2));
            return errorResult;
          }
        },
      }),

      findOverlap: tool({
        description:
          "Find overlapping free time slots. Demo people: janet, pete, phil, tommy, etc. (see system prompt) or Google Calendar for real accounts.",
        inputSchema: z.object({
          userIds: z
            .array(z.string())
            .default([])
            .describe(
              "User IDs to check. Omit or pass [] when scheduling participants are already set in the app — their IDs will be applied automatically.",
            ),
          startDate: z.string().describe("Start date in YYYY-MM-DD format"),
          endDate: z.string().describe("End date in YYYY-MM-DD format"),
          durationMinutes: z
            .number()
            .describe("Required meeting duration in minutes (default: 60)"),
        }),
        execute: async ({ userIds, startDate, endDate, durationMinutes = 60 }) => {
          try {
            const rangeStart = new Date(startDate);
            const rangeEnd = new Date(endDate);

            const resolvedUserIds =
              userIds.length > 0
                ? userIds
                : schedulingParticipants.map((p) => p.memberUserId);

            if (resolvedUserIds.length === 0) {
              return {
                suggestedSlots: [],
                searchedUsers: [],
                duration: durationMinutes,
                error:
                  "No participants selected for overlap. Ask the user who should be included (names or user ids from the demo network in the system prompt), or ensure scheduling participants are set in the app.",
              };
            }

            // Fetch availability for each user
            const userAvailability = new Map();

            for (const userId of resolvedUserIds) {
              try {
                if (resolveMockCalendarId(userId)) {
                  const eff = effectiveMockQueryRange(startDate, endDate);
                  const winStart = new Date(`${eff.start}T00:00:00`);
                  const winEnd = new Date(`${eff.end}T23:59:59.999`);
                  const { events: inRange } = getMockFilteredEventsForTool(
                    userId,
                    startDate,
                    endDate,
                  );
                  const busyBlocks = mockEventsToBusyBlocks(inRange);
                  const freeWindows = calculateFreeWindows(
                    busyBlocks,
                    winStart,
                    winEnd,
                  );
                  userAvailability.set(userId, freeWindows);
                  continue;
                }

                // Get calendar account
                const accountsSnapshot = await collection("users")
                  .doc(userId)
                  .collection("calendarAccounts")
                  .where("provider", "==", "google")
                  .where("isActive", "==", true)
                  .limit(1)
                  .get();

                if (accountsSnapshot.empty) {
                  // User has no calendar - assume available during working hours
                  userAvailability.set(userId, [
                    {
                      start: rangeStart.toISOString(),
                      end: rangeEnd.toISOString(),
                      quality: "high" as const,
                    },
                  ]);
                  continue;
                }

                const accountDoc = accountsSnapshot.docs[0];
                const accountData = accountDoc.data();

                // Decrypt tokens
                const accessToken = decrypt(accountData.accessToken);
                const refreshToken = accountData.refreshToken
                  ? decrypt(accountData.refreshToken)
                  : null;

                // Set up OAuth client
                const oauth2Client = new googleApis.auth.OAuth2(
                  process.env.GOOGLE_CLIENT_ID,
                  process.env.GOOGLE_CLIENT_SECRET,
                  process.env.OAUTH_REDIRECT_URI
                );

                oauth2Client.setCredentials({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                });

                // Fetch events
                const calendar = googleApis.calendar({ version: "v3", auth: oauth2Client });

                const response = await calendar.events.list({
                  calendarId: "primary",
                  timeMin: rangeStart.toISOString(),
                  timeMax: rangeEnd.toISOString(),
                  maxResults: 250,
                  singleEvents: true,
                });

                const events = response.data.items || [];

                // Convert to busy blocks and calculate free windows
                const busyBlocks = eventsToBusyBlocks(events);
                const freeWindows = calculateFreeWindows(
                  busyBlocks,
                  rangeStart,
                  rangeEnd
                );

                userAvailability.set(userId, freeWindows);
              } catch (error) {
                console.error(`Error fetching availability for ${userId}:`, error);
                userAvailability.set(userId, []);
              }
            }

            // Find common free slots
            const commonSlots = findCommonFreeSlots(userAvailability, durationMinutes);

            // Format top suggestions
            const topSlots = commonSlots.slice(0, 5).map((slot) => {
              const start = new Date(slot.start);
              const end = new Date(slot.end);
              const duration = (end.getTime() - start.getTime()) / (1000 * 60);

              return {
                start: slot.start,
                end: slot.end,
                availableFor: slot.availableUsers,
                unavailableFor: slot.unavailableUsers,
                durationMinutes: Math.floor(duration),
                confidence:
                  slot.availableUsers.length === resolvedUserIds.length
                    ? "high"
                    : "medium",
              };
            });

            const result = {
              suggestedSlots: topSlots,
              searchedUsers: resolvedUserIds,
              duration: durationMinutes,
              totalSlotsFound: commonSlots.length,
            };

            console.log("=== TOOL RESULT: findOverlap ===");
            console.log(JSON.stringify(result, null, 2));

            return result;
          } catch (error) {
            console.error("Error finding overlap:", error);
            const errorResult = {
              suggestedSlots: [],
              searchedUsers: userIds,
              error: error instanceof Error ? error.message : "Unknown error",
            };
            console.log("=== TOOL ERROR: findOverlap ===");
            console.log(JSON.stringify(errorResult, null, 2));
            return errorResult;
          }
        },
      }),

      createEvent: tool({
        description:
          "Create an event on the current user's Google Calendar. ALWAYS confirm details with the user before calling this tool.",
        inputSchema: z.object({
          summary: z.string().describe("Event title"),
          startDateTime: z
            .string()
            .describe("ISO-8601 start datetime (e.g. 2026-03-25T10:00:00-07:00)"),
          endDateTime: z
            .string()
            .describe("ISO-8601 end datetime (e.g. 2026-03-25T11:00:00-07:00)"),
          description: z.string().optional().describe("Optional event description"),
          attendeeEmails: z
            .array(z.string())
            .optional()
            .describe("Optional list of attendee email addresses"),
          timeZone: z
            .string()
            .optional()
            .describe("IANA timezone (e.g. America/Los_Angeles). Defaults to user preference."),
        }),
        execute: async ({
          summary,
          startDateTime,
          endDateTime,
          description,
          attendeeEmails,
          timeZone,
        }) => {
          try {
            console.log("=== TOOL: createEvent ===");
            console.log("Summary:", summary);
            console.log("Start:", startDateTime, "End:", endDateTime);
            console.log("Attendees:", attendeeEmails);

            if (!currentUserId) {
              return { error: "No user is logged in — cannot create an event." };
            }

            const accountsSnapshot = await collection("users")
              .doc(currentUserId)
              .collection("calendarAccounts")
              .where("provider", "==", "google")
              .where("isActive", "==", true)
              .limit(1)
              .get();

            if (accountsSnapshot.empty) {
              return {
                error:
                  "No Google Calendar connected. Ask the user to connect their calendar in Settings first.",
              };
            }

            const accountDoc = accountsSnapshot.docs[0];
            const accountData = accountDoc.data();

            let accessToken = decrypt(accountData.accessToken);
            const refreshToken = accountData.refreshToken
              ? decrypt(accountData.refreshToken)
              : null;

            const tokenExpiresAt = accountData.tokenExpiresAt?.toDate();
            if (tokenExpiresAt && tokenExpiresAt <= new Date()) {
              if (!refreshToken) {
                return { error: "Calendar token expired and no refresh token available." };
              }

              const oauth2Client = new googleApis.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET,
                process.env.OAUTH_REDIRECT_URI,
              );
              oauth2Client.setCredentials({ refresh_token: refreshToken });

              const { credentials } = await oauth2Client.refreshAccessToken();

              const ts = timestamps();
              await collection("users")
                .doc(currentUserId)
                .collection("calendarAccounts")
                .doc(accountDoc.id)
                .update({
                  accessToken: credentials.access_token
                    ? encrypt(credentials.access_token)
                    : accountData.accessToken,
                  tokenExpiresAt: credentials.expiry_date
                    ? new Date(credentials.expiry_date)
                    : null,
                  updatedAt: ts.updatedAt,
                });

              if (credentials.access_token) {
                accessToken = credentials.access_token;
              }
            }

            let resolvedTimeZone = timeZone;
            if (!resolvedTimeZone) {
              resolvedTimeZone = userTimeZone;
            }

            const created = await createCalendarEvent(accessToken, {
              summary,
              startDateTime,
              endDateTime,
              timeZone: resolvedTimeZone,
              description,
              attendeeEmails,
            });

            console.log("=== TOOL RESULT: createEvent ===");
            console.log(JSON.stringify(created, null, 2));

            return {
              success: true,
              eventId: created.id,
              htmlLink: created.htmlLink,
              summary: created.summary,
              start: created.start,
              end: created.end,
              attendees: created.attendees,
            };
          } catch (error) {
            console.error("Error creating event:", error);
            return {
              error: error instanceof Error ? error.message : "Unknown error creating event",
            };
          }
        },
      }),

      createGuestEvent: tool({
        description:
          "Create a scheduling poll for guests (not logged in). Call only after the conversation collected: date window, general times, meeting title, creator personal availability (and earliest/latest if stated), creator name, and timezone — in that guest flow order.",
        inputSchema: z.object({
          title: z.string().describe("Event title/name"),
          dateRangeStart: z.string().describe("Start date ISO or friendly (e.g. '2026-03-24' or 'Mar 24')"),
          dateRangeEnd: z.string().describe("End date ISO or friendly"),
          timezone: z.string().describe("IANA timezone (e.g. 'America/Los_Angeles')"),
          earliestTime: z.string().optional().describe("Earliest time to consider (e.g. '09:00')"),
          latestTime: z.string().optional().describe("Latest time to consider (e.g. '17:00')"),
          durationMinutes: z.number().optional().describe("Expected duration in minutes"),
          creatorName: z.string().describe("The creator's name for the poll"),
          creatorAvailability: z.string().describe("The creator's availability description (e.g. '9–12 and 1:30–3 both days')"),
        }),
        execute: async ({ title, dateRangeStart, dateRangeEnd, timezone, earliestTime, latestTime, durationMinutes, creatorName, creatorAvailability }) => {
          console.log("=== TOOL: createGuestEvent ===");
          console.log({ title, dateRangeStart, dateRangeEnd, timezone, earliestTime, latestTime, durationMinutes, creatorName, creatorAvailability });

          try {
            const db = await import("@/lib/firebase-admin").then(m => m.getDb());
            // Parse creator's availability text into slot IDs
            const parsedSlots = parseAvailability({
              availabilityText: creatorAvailability,
              dateRangeStart,
              dateRangeEnd,
              timezone,
            });
            const inferredBounds = inferAvailabilityBoundsFromSlots(parsedSlots);

            console.log("Parsed availability slots:", parsedSlots);

            // Use consistent creator ID
            const creatorTempId = `guest_${creatorName.toLowerCase().replace(/\s+/g, '_')}`;

            const eventRef = db.collection("events").doc();
            const eventId = eventRef.id;
            const shareUrl = publicEventUrl(eventId);

            // Create event in Firestore (shareUrl stored on the document for clients / console)
            const eventData = {
              title,
              createdBy: creatorTempId, // Store the actual guest ID, not just "guest"
              creatorName, // Store the creator's name for display
              participantIds: [creatorTempId],
              dateRangeStart,
              dateRangeEnd,
              durationMinutes: durationMinutes || 60,
              timezone,
              status: "active",
              earliestTime: earliestTime || inferredBounds?.earliestTime || "09:00",
              latestTime: latestTime || inferredBounds?.latestTime || "17:00",
              shareUrl,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            await eventRef.set(eventData);

            // Create participant entry for the creator
            const participantData = {
              userId: creatorTempId,
              eventId,
              name: creatorName,
              availabilityText: creatorAvailability,
              isCreator: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            await db
              .collection("events")
              .doc(eventId)
              .collection("participants")
              .doc(creatorTempId)
              .set(participantData);

            // Save parsed availability slots to the availability subcollection
            const availabilityData = {
              userId: creatorTempId,
              source: "agent_parsed",
              slots: parsedSlots,
              originalText: creatorAvailability,
              busyBlocks: [],
              freeWindows: [],
              lastSyncedAt: new Date(),
              updatedAt: new Date(),
            };

            await db.collection("events")
              .doc(eventId)
              .collection("availability")
              .doc(creatorTempId)
              .set(availabilityData);

            return {
              success: true,
              eventId,
              shareUrl,
              guestId: creatorTempId,
              creatorName,
              title,
              dateRangeStart,
              dateRangeEnd,
              timezone,
              durationMinutes: durationMinutes || 60,
              message: `Your poll for ${title} is ready below.`,
            };
          } catch (error) {
            console.error("Error creating guest event:", error);
            return {
              success: false,
              error: error instanceof Error ? error.message : "Failed to create event",
            };
          }
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
