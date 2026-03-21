import { google } from "@ai-sdk/google";
import { streamText, tool, convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import { z } from "zod";

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: google("gemini-2.0-flash-lite-preview-02-05"),
    system: `You are Chat2meet Agent, a smart scheduling assistant.
Help users find times to meet with their friends and colleagues.

If the user is in onboarding mode (based on context or first message), guide them through:
1. Connecting Google Calendar
2. Setting Public Preferences
3. Setting Private Preferences

Otherwise, focus on scheduling.

On your first message, introduce yourself briefly. Then:
- Keep responses brief and conversational
- When a user mentions wanting to meet with someone specific, use your tools to find overlapping free times and suggest specific times without asking lots of follow-up questions
- Call suggestTimes when you find good meeting times to display them interactively

Today's date is ${new Date().toISOString().split("T")[0]}.`,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools: {
      completeOnboarding: tool({
        description: "Mark onboarding as complete and update user data",
        inputSchema: z.object({}),
        execute: async () => {
          return { success: true };
        },
      }),
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
        execute: async ({ times, message }) => ({
          suggestedTimes: times,
          explanation: message,
        }),
      }),

      getFriends: tool({
        description: "Get the current user's list of friends and contacts",
        inputSchema: z.object({}),
        execute: async () => [
          { id: "u1", name: "Alice Chen", email: "alice@example.com" },
          { id: "u2", name: "Bob Park", email: "bob@example.com" },
          { id: "u3", name: "Carmen Liu", email: "carmen@example.com" },
          { id: "u4", name: "David Kim", email: "david@example.com" },
        ],
      }),

      getSchedule: tool({
        description:
          "Get a user's existing calendar events and busy blocks for a date range",
        inputSchema: z.object({
          userId: z.string().describe("The user ID to get schedule for"),
          startDate: z.string().describe("Start date in YYYY-MM-DD format"),
          endDate: z.string().describe("End date in YYYY-MM-DD format"),
        }),
        execute: async ({ userId }) => {
          const mockSchedules: Record<
            string,
            Array<{ title: string; start: string; end: string }>
          > = {
            u1: [
              {
                title: "Standup",
                start: "2026-03-23T09:00:00",
                end: "2026-03-23T09:30:00",
              },
              {
                title: "Design review",
                start: "2026-03-24T14:00:00",
                end: "2026-03-24T15:00:00",
              },
            ],
            u2: [
              {
                title: "1:1 with manager",
                start: "2026-03-23T10:00:00",
                end: "2026-03-23T11:00:00",
              },
              {
                title: "Sprint planning",
                start: "2026-03-25T09:00:00",
                end: "2026-03-25T11:00:00",
              },
            ],
            u3: [
              {
                title: "Client call",
                start: "2026-03-23T13:00:00",
                end: "2026-03-23T14:00:00",
              },
              {
                title: "Team lunch",
                start: "2026-03-24T12:00:00",
                end: "2026-03-24T13:30:00",
              },
            ],
            u4: [
              {
                title: "Workshop",
                start: "2026-03-24T09:00:00",
                end: "2026-03-24T12:00:00",
              },
            ],
          };
          return { userId, events: mockSchedules[userId] ?? [] };
        },
      }),

      findOverlap: tool({
        description:
          "Find overlapping free time slots between multiple users for a meeting",
        inputSchema: z.object({
          userIds: z
            .array(z.string())
            .describe("List of user IDs to find overlap for"),
          startDate: z.string().describe("Start date in YYYY-MM-DD format"),
          endDate: z.string().describe("End date in YYYY-MM-DD format"),
          durationMinutes: z
            .number()
            .describe("Required meeting duration in minutes"),
        }),
        execute: async ({ userIds, durationMinutes }) => ({
          suggestedSlots: [
            {
              start: "2026-03-23T15:00:00",
              end: "2026-03-23T16:00:00",
              availableFor: userIds,
              confidence: "high",
            },
            {
              start: "2026-03-25T14:00:00",
              end: "2026-03-25T15:00:00",
              availableFor: userIds,
              confidence: "medium",
            },
          ],
          searchedUsers: userIds,
          duration: durationMinutes,
        }),
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
