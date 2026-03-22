import { google } from "@ai-sdk/google";
import { streamText, tool, convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import { z } from "zod";
import { getAuth, getDb } from "@/lib/firebase-admin";
import { FIREBASE_SESSION_COOKIE } from "@/lib/auth-session";
import { cookies } from "next/headers";
import { fetchUserCalendarEvents } from "@/lib/calendar-server";

const DAYS_NAMES = ["Mon 23", "Tue 24", "Wed 25", "Thu 26", "Fri 27"];
const TIME_SLOTS: string[] = [];
for (let h = 9; h <= 17; h++) {
  TIME_SLOTS.push(`${h}:00`);
  TIME_SLOTS.push(`${h}:30`);
}

function formatSlots(slots: string[]): string {
  if (!slots || slots.length === 0) return "No specific availability set.";
  return slots.map(s => {
    const [d, t] = s.split("-").map(Number);
    return `${DAYS_NAMES[d]} ${TIME_SLOTS[t]}`;
  }).join(", ");
}

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  // Try to get user preferences and ID for the system prompt
  let privatePrefs = "";
  let currentUserId: string | null = null;
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(FIREBASE_SESSION_COOKIE)?.value;
    if (sessionCookie) {
      const auth = getAuth();
      const decoded = await auth.verifySessionCookie(sessionCookie);
      currentUserId = decoded.uid;
      const db = getDb();
      const userDoc = await db.collection("users").doc(decoded.uid).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        const readableAvail = formatSlots(data?.availableSlots || []);
        privatePrefs = `\n\nUSER PRIVATE PREFERENCES (Only you can see this):\n- Preferred meeting times: ${readableAvail}\n- Public Preferences: ${data?.preferences?.public || "None set"}\n- Private Preferences: ${data?.preferences?.private || "None set"}`;
      }
    }
  } catch (e) {
    console.error("Error fetching user prefs for chat:", e);
  }

  const result = streamText({
    // Use stable model names: gemini-2.0-flash-lite-preview-02-05 or gemini-1.5-flash
    model: google(process.env.GEMINI_MODEL || "gemini-2.0-flash-lite-preview-02-05"),
    system: `You are Chat2meet Agent, a smart scheduling assistant.
Help users find times to meet with their friends and colleagues.

On your first message, introduce yourself briefly. Then:
- Keep responses brief and conversational
- When a user wants to schedule a meeting, immediately call findFreeSlots to find available times in their calendar. Do NOT say you can't check their calendar — you CAN.
- After finding free slots, call suggestTimes to display them interactively
- Use getMySchedule if the user asks about specific events or what they have scheduled
- If findFreeSlots returns free slots, suggest the best ones — don't tell the user there's no availability unless totalFound is 0
- Default to 30-minute meetings and the current/next week unless the user specifies otherwise

Today's date is ${new Date().toISOString().split("T")[0]}.${privatePrefs}`,
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

      getMySchedule: tool({
        description:
          "Get the current user's real Google Calendar events for a date range. Use this to check what times the user is busy before suggesting meeting times.",
        inputSchema: z.object({
          startDate: z.string().describe("Start date in YYYY-MM-DD format"),
          endDate: z.string().describe("End date in YYYY-MM-DD format"),
        }),
        execute: async ({ startDate, endDate }) => {
          if (!currentUserId) {
            return { error: "User not authenticated", events: [] };
          }
          try {
            // Append Z or time offset for RFC3339 compliance
            const events = await fetchUserCalendarEvents(
              currentUserId,
              new Date(startDate + "T00:00:00Z").toISOString(),
              new Date(endDate + "T23:59:59Z").toISOString(),
              50,
            );
            if (!events) {
              return { error: "Google Calendar not connected. Tell the user: 'I noticed your Google Calendar is not connected. Can you click Connect in your settings so I can check your real schedule?'", events: [] };
            }
            return {
              events: events.map(e => ({
                title: e.summary,
                start: e.start,
                end: e.end,
                location: e.location,
              })),
            };
          } catch (err) {
            console.error("Failed to fetch user calendar:", err);
            return { error: "Failed to fetch calendar events", events: [] };
          }
        },
      }),

      findFreeSlots: tool({
        description:
          "Find free time slots in the current user's calendar for a date range. Returns available 30-minute or 1-hour blocks when the user has no events.",
        inputSchema: z.object({
          startDate: z.string().describe("Start date in YYYY-MM-DD format"),
          endDate: z.string().describe("End date in YYYY-MM-DD format"),
          durationMinutes: z
            .number()
            .describe("Required meeting duration in minutes (e.g. 30, 60)"),
          startHour: z.number().optional().describe("Earliest hour to consider (default 9)"),
          endHour: z.number().optional().describe("Latest hour to consider (default 17)"),
        }),
        execute: async ({ startDate, endDate, durationMinutes, startHour = 9, endHour = 17 }) => {
          if (!currentUserId) {
            return { error: "User not authenticated", freeSlots: [] };
          }
          try {
            // Append Z for RFC3339 compliance
            const events = await fetchUserCalendarEvents(
              currentUserId,
              startDate + "T00:00:00Z",
              endDate + "T23:59:59Z",
              200,
            );
            if (!events) {
              return { error: "Google Calendar not connected. Tell the user: 'I noticed your Google Calendar is not connected. Can you click Connect in your settings so I can check your real schedule?'", freeSlots: [] };
            }

            const busyBlocks = events
              .filter(e => e.start && e.end)
              .map(e => ({
                start: new Date(e.start).getTime(),
                end: new Date(e.end).getTime(),
              }));

            const [sY, sM, sD] = startDate.split("-").map(Number);
            const [eY, eM, eD] = endDate.split("-").map(Number);
            const startLocal = new Date(sY, sM - 1, sD);
            const endLocal = new Date(eY, eM - 1, eD);

            const freeSlots: Array<{ start: string; end: string; date: string }> = [];

            for (let d = new Date(startLocal); d <= endLocal; d.setDate(d.getDate() + 1)) {
              if (d.getDay() === 0 || d.getDay() === 6) continue;

              for (let h = startHour; h < endHour; h++) {
                for (const m of [0, 30]) {
                  const slotStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0);
                  const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);

                  if (slotEnd.getHours() > endHour || (slotEnd.getHours() === endHour && slotEnd.getMinutes() > 0)) continue;

                  const slotStartMs = slotStart.getTime();
                  const slotEndMs = slotEnd.getTime();
                  const isBusy = busyBlocks.some(
                    b => slotStartMs < b.end && slotEndMs > b.start
                  );

                  if (!isBusy) {
                    freeSlots.push({
                      start: slotStart.toISOString(),
                      end: slotEnd.toISOString(),
                      date: slotStart.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
                    });
                  }
                }
              }
            }

            return { freeSlots: freeSlots.slice(0, 20), totalFound: freeSlots.length };
          } catch (err) {
            console.error("Failed to find free slots:", err);
            return { error: "Failed to compute free slots", freeSlots: [] };
          }
        },
      }),

      getFriends: tool({
        description: "Get the current user's list of friends and contacts from the platform",
        inputSchema: z.object({}),
        execute: async () => {
          if (!currentUserId) {
            return { error: "User not authenticated", friends: [] };
          }
          try {
            const db = getDb();
            const friendsSnapshot = await db
              .collection("users")
              .doc(currentUserId)
              .collection("friends")
              .get();

            if (friendsSnapshot.empty) {
              return { friends: [], message: "No friends added yet. The user can invite people from the Network page." };
            }

            const friends = friendsSnapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                name: data.name || data.displayName || data.email,
                email: data.email,
                status: data.status || "accepted",
              };
            });
            return { friends };
          } catch (err) {
            console.error("Failed to fetch friends:", err);
            return { error: "Failed to fetch friends list", friends: [] };
          }
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
