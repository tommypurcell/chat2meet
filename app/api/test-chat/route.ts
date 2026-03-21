import { google } from "@ai-sdk/google";
import { streamText, tool, convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import { z } from "zod";
import {
  eventsToBusyBlocks,
  calculateFreeWindows,
  findCommonFreeSlots,
} from "@/lib/calendar-utils";
import type { SchedulingParticipant } from "@/lib/types";
import { defaultDevUserId } from "@/lib/dev-user-ids";
import { formatCalendarEventsForPrompt } from "@/lib/format-calendar-for-prompt";
import { MOCK_CALENDAR_EVENTS } from "@/lib/data";

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

  let userCalendarData = "";
  try {
    const now = new Date();
    const nextWeek = new Date(now);
    nextWeek.setDate(now.getDate() + 7);
    const rangeLabel = `${now.toISOString().split("T")[0]} → ${nextWeek.toISOString().split("T")[0]}`;

    const rawEvents = MOCK_CALENDAR_EVENTS[currentUserId as keyof typeof MOCK_CALENDAR_EVENTS] || [];
    
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
      );
    } else {
      userCalendarData = `\n\n## User's Google Calendar\nNo timed events in this window — the calendar looks free.`;
    }
  } catch (error) {
    console.error("[Test Chat API] Error formatting calendar:", error);
    userCalendarData = `\n\n## User's Google Calendar\nError loading test data.`;
  }

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

IMPORTANT: Today's date is ${new Date().toISOString().split("T")[0]}.

${userCalendarData}

On your first message, introduce yourself briefly. Then:
- Keep responses brief and conversational
- For the **current user's** schedule in the next ~7 days, rely on the **User's Google Calendar** section above when it is present
- When a user mentions meeting with someone specific, use your tools to find overlapping free times and suggest specific times
- Call suggestTimes when you find good meeting times to display them interactively
${schedulingBlock}`;

  const result = streamText({
    model: google("gemini-2.5-flash-lite"),
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
            .describe("Brief message explaining why these times work"),
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
            : [
                { id: "user_pete", name: "Pete", email: "pete@example.com" },
                { id: "user_rae", name: "Rae", email: "rae@example.com" },
                { id: "user_sarah", name: "Sarah", email: "sarah@example.com" },
                { id: "user_janet", name: "Janet", email: "janet@example.com" },
                { id: "user_tommy", name: "Tommy", email: "tommy@example.com" },
              ];
          return friends;
        },
      }),

      getSchedule: tool({
        description:
          "Get calendar events and busy blocks for a date range from Google Calendar. The current user's next ~7 days are usually already in the system prompt.",
        inputSchema: z.object({
          userId: z.string().describe("The user ID to get schedule for (e.g., 'user_tommy')"),
          startDate: z.string().describe("Start date in YYYY-MM-DD format"),
          endDate: z.string().describe("End date in YYYY-MM-DD format"),
        }),
        execute: async ({ userId, startDate, endDate }) => {
          try {
            console.log("[Test getSchedule] user:", userId);
            const events = MOCK_CALENDAR_EVENTS[userId as keyof typeof MOCK_CALENDAR_EVENTS] || [];
            
            // Map to format
            const mappedEvents = events.map(e => ({
               start: { dateTime: e.start },
               end: { dateTime: e.end },
               summary: e.title
            }));

            const busyBlocks = eventsToBusyBlocks(mappedEvents as any);
            const eventSummaries = events.map((e) => ({
              title: e.title || "Busy",
              start: e.start,
              end: e.end,
            }));

            return {
              userId,
              events: eventSummaries,
              busyBlocks,
              totalEvents: events.length,
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
              "User IDs to check. Omit or pass [] when the user already chose people from Add network — their IDs will be applied automatically.",
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
              return { error: "No participants selected." };
            }

            const userAvailability = new Map();

            for (const userId of resolvedUserIds) {
              const events = MOCK_CALENDAR_EVENTS[userId as keyof typeof MOCK_CALENDAR_EVENTS] || [];
              const mappedEvents = events.map(e => ({
                start: { dateTime: e.start },
                end: { dateTime: e.end },
                summary: e.title
              }));
              const busyBlocks = eventsToBusyBlocks(mappedEvents as any);
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
    },
  });

  return result.toUIMessageStreamResponse();
}
