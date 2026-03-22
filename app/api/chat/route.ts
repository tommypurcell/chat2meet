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

  const clientCalendar =
    typeof body.calendarContext === "string" ? body.calendarContext.trim() : "";

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
        const nextWeek = new Date(now);
        nextWeek.setDate(now.getDate() + 7);

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

          const rangeLabel = `${now.toISOString().split("T")[0]} → ${nextWeek.toISOString().split("T")[0]}`;

          const mapped = events
            .filter((e) => e.start?.dateTime)
            .map((e) => ({
              summary: e.summary,
              start: e.start!.dateTime!,
              end: e.end?.dateTime,
            }));

          let timeZone = "America/Los_Angeles";
          try {
            const userSnap = await collection("users").doc(currentUserId).get();
            const t = userSnap.data()?.timezone;
            if (typeof t === "string" && t.trim()) timeZone = t.trim();
          } catch {
            /* keep default */
          }

          userCalendarData = formatCalendarEventsForPrompt(
            currentUserId,
            mapped,
            `next 7 days (${rangeLabel})`,
            timeZone,
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

  let timeZoneForMock = "America/Los_Angeles";
  try {
    const userSnap = await collection("users").doc(currentUserId).get();
    const t = userSnap.data()?.timezone;
    if (typeof t === "string" && t.trim()) timeZoneForMock = t.trim();
  } catch {
    /* keep default */
  }

  const mockNetworkCalendarsBlock = formatMockNetworkCalendarsForPrompt(
    timeZoneForMock,
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

  const systemPrompt = `You are Chat2Meet Agent, a smart scheduling assistant.
Help users find times to meet with their friends and colleagues.

## Current User
The logged-in user's ID is: ${currentUserId ?? "(unknown)"}

IMPORTANT: Today's date is ${new Date().toISOString().split("T")[0]}.

${userCalendarData}
${mockNetworkCalendarsBlock}

On your first message, introduce yourself briefly. Then:
- Keep responses brief and conversational
- For the **current user's** schedule in the next ~7 days, rely on the **User's Google Calendar** and **Computed availability** sections above when present
- **"When am I free?"** Use the **Free** gaps in **Computed availability** (timezone shown there). Never say you are "free all day" on a day that has any **Busy** interval or timed event. Do not invent free time inside a busy block.
- For **Janet, Pete, Phil**, and other people in **Demo network calendars**, use the schedules above or call \`getSchedule\` / \`findOverlap\` with ids \`janet\`, \`pete\`, \`phil\` (or legacy \`user_janet\`, etc. — both work). Demo event dates are **Mar 15–29, 2026** (\`America/Los_Angeles\`).
- When a user mentions meeting with someone specific, use your tools to find overlapping free times and suggest specific times
- Call suggestTimes when you find good meeting times to display them interactively
- You can create events on the user's Google Calendar with the \`createEvent\` tool
- **NEVER call createEvent without the user's explicit confirmation.** Always summarise the event (title, date/time, attendees) and ask "Should I create this?" first.
- After creating an event, tell the user it was added and share the Google Calendar link from the result so they can open it
${schedulingBlock}
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
              resolvedTimeZone = timeZoneForMock;
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
    },
  });

  return result.toUIMessageStreamResponse();
}
