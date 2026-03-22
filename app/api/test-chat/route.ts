import { google } from "@ai-sdk/google";
import { streamText, tool, convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import { z } from "zod";
import {
  calculateFreeWindows,
  findCommonFreeSlots,
} from "@/lib/calendar-utils";
import type { SchedulingParticipant } from "@/lib/types";
import { defaultDevUserId } from "@/lib/dev-user-ids";
import { AGENT_PLAIN_TEXT_OUTPUT_RULES } from "@/lib/agent-plain-text-prompt";
import {
  formatCalendarEventsForPrompt,
  formatMockNetworkCalendarsForPrompt,
} from "@/lib/format-calendar-for-prompt";
import { MOCK_CALENDAR_EVENTS, MOCK_CONNECTIONS } from "@/lib/data";
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

export async function POST(req: Request) {
  const body = (await req.json()) as {
    messages?: UIMessage[];
    schedulingParticipants?: unknown;
    currentUserId?: string;
  };
  const messages = body.messages ?? [];

  const currentUserId = body.currentUserId?.trim() || "user_phil";

  console.log("[Test Chat API] currentUserId:", currentUserId);

  const schedulingParticipants = parseSchedulingParticipants(body.schedulingParticipants);

  const demoTz = "America/Los_Angeles";

  let userCalendarData = "";
  try {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const rangeLabel = `${calendarDateInTimeZone(now, demoTz)} → ${calendarDateInTimeZone(nextWeek, demoTz)}`;

    const calendarKey = resolveMockCalendarId(currentUserId);
    const rawEvents = calendarKey
      ? MOCK_CALENDAR_EVENTS[calendarKey as keyof typeof MOCK_CALENDAR_EVENTS] ?? []
      : [];
    
    if (rawEvents.length > 0) {
      const mapped = rawEvents.map((e) => ({
        summary: e.title,
        start: e.start,
        end: e.end,
      }));

      userCalendarData = formatCalendarEventsForPrompt(
        currentUserId,
        mapped,
        `next 7 days (${rangeLabel})`,
        demoTz,
        Date.now(),
        "demo",
      );
    } else {
      userCalendarData = `\n\n## User's Google Calendar\nNo timed events in this window — the calendar looks free.`;
    }
  } catch (error) {
    console.error("[Test Chat API] Error formatting calendar:", error);
    userCalendarData = `\n\n## User's Google Calendar\nError loading test data.`;
  }

  const mockNetworkCalendarsBlock = formatMockNetworkCalendarsForPrompt(
    demoTz,
    Date.now(),
    { omitUserIds: [currentUserId] },
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

  const systemPrompt = `You are When2Meet Agent, a smart scheduling assistant.
Help users find times to meet with their friends and colleagues.

## Current User
The logged-in user's ID is: ${currentUserId ?? "(unknown)"}

IMPORTANT: Demo timezone is ${demoTz}. Local calendar date (not UTC): ${calendarDateInTimeZone(new Date(), demoTz)}. Local time now: ${formatLocalDateTimeForPrompt(new Date(), demoTz)}. Use this local date for "today" — do not infer the calendar day from UTC.

${userCalendarData}
${mockNetworkCalendarsBlock}

On your first message, introduce yourself briefly. Then:
- Keep responses brief and conversational
- For the **current user's** schedule, rely on the **Demo calendar** section above for their id
- For **Janet, Pete, Phil**, use **Demo network calendars** below or tools with ids \`janet\`, \`pete\`, \`phil\` (or \`user_janet\`, etc.). Demo dates are **Mar 15–29, 2026** (\`America/Los_Angeles\`).
- When a user mentions meeting with someone specific, use your tools to find overlapping free times and suggest specific times
- **IMPORTANT**: You MUST call the \`suggestTimes\` tool whenever you provide meeting time recommendations. This displays the times as interactive chips that users can click. Format each time with {id, time: "5:00 PM", date: "Mon Mar 25"}. Always call this tool after finding available slots - never just list times in your text response.
- Once the user selects or confirms a specific time slot (e.g. "Create an event for Monday at 2 PM"), call the \`createEvent\` tool to finalize the meeting on the platform and send Google Calendar invites.
${schedulingBlock}
${AGENT_PLAIN_TEXT_OUTPUT_RULES}`;

  const result = streamText({
    model: google("gemini-3-flash-preview"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    onStepFinish({ text, toolCalls, toolResults, finishReason, usage }) {
      console.log("=== TEST AGENT STEP FINISH ===");
      console.log("Text Output:", text);
      console.log("Tool Calls:", JSON.stringify(toolCalls, null, 2));
      console.log("Tool Results:", JSON.stringify(toolResults, null, 2));
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
          return { suggestedTimes: times, explanation: message };
        },
      }),

      getFriends: tool({
        description: "Get the current user's list of friends and contacts",
        inputSchema: z.object({}),
        execute: async () => {
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
          return friends;
        },
      }),

      getSchedule: tool({
        description:
          "Get calendar events and busy blocks for a date range from Google Calendar. The current user's next ~7 days are usually already in the system prompt.",
        inputSchema: z.object({
          userId: z.string().describe("Demo id: janet, pete, phil, … or user_janet"),
          startDate: z.string().describe("Start date in YYYY-MM-DD format"),
          endDate: z.string().describe("End date in YYYY-MM-DD format"),
        }),
        execute: async ({ userId, startDate, endDate }) => {
          try {
            console.log("[Test getSchedule] user:", userId);
            const {
              canonicalId,
              events: inRange,
              note,
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
            };
          } catch (error) {
            return { userId, events: [], error: String(error) };
          }
        },
      }),

      findOverlap: tool({
        description:
          "Find overlapping free time slots between multiple users for a meeting using their real Google Calendar data",
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
            const eff = effectiveMockQueryRange(startDate, endDate);
            const rangeStart = new Date(`${eff.start}T00:00:00`);
            const rangeEnd = new Date(`${eff.end}T23:59:59.999`);

            const resolvedUserIds =
              userIds.length > 0
                ? userIds
                : schedulingParticipants.map((p) => p.memberUserId);

            if (resolvedUserIds.length === 0) {
              return {
                error:
                  "No participants selected for overlap. Ask the user who should be included (names or user ids from the demo network in the system prompt), or ensure scheduling participants are set in the app.",
              };
            }

            const userAvailability = new Map();

            for (const userId of resolvedUserIds) {
              const { events: inRange } = getMockFilteredEventsForTool(
                userId,
                startDate,
                endDate,
              );
              const busyBlocks = mockEventsToBusyBlocks(inRange);
              const freeWindows = calculateFreeWindows(busyBlocks, rangeStart, rangeEnd);
              userAvailability.set(userId, freeWindows);
            }

            const commonSlots = findCommonFreeSlots(userAvailability, durationMinutes);

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

            return {
              suggestedSlots: topSlots,
              searchedUsers: resolvedUserIds,
              duration: durationMinutes,
              totalSlotsFound: commonSlots.length,
            };
          } catch (error) {
            return { error: String(error) };
          }
        },
      }),

      createEvent: tool({
        description: "Create a meeting on the platform (mocked)",
        inputSchema: z.object({
          title: z.string().describe("The title of the meeting"),
          startTime: z.string().describe("ISO start time string"),
          endTime: z.string().describe("ISO end time string"),
          participantIds: z.array(z.string()).optional().describe("User IDs to invite"),
          description: z.string().optional().describe("Optional description"),
        }),
        execute: async ({ title, startTime, endTime, participantIds, description }) => {
          console.log("=== MOCK TOOL: createEvent ===");
          console.log("Input:", { title, startTime, endTime, participantIds, description });
          return {
            success: true,
            eventId: "mock-event-id-" + Date.now(),
            message: `Event "${title}" has been successfully created (MOCK).`,
          };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
