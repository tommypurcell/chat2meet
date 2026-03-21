import { google } from "@ai-sdk/google";
import { streamText, tool, convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import { z } from "zod";
import { getDb } from "@/lib/firebase-admin";

const CURRENT_USER_ID = "user_rae";

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const db = getDb();

  console.log(`[CHAT] New request with ${messages.length} messages`);
  if (messages.length > 0) {
    const lastMsg = messages[messages.length - 1];
    console.log(`[CHAT] Last message:`, lastMsg.role, lastMsg.parts?.[0]);
  }

  const result = streamText({
    model: google("gemini-2.5-flash-lite"),
    system: `You are When2Meet Agent, a smart scheduling assistant.
Help users find times to meet with their friends and colleagues.

Your primary goal is to ALWAYS suggest specific times or ask about schedules. Never give vague responses.

The current event ID is "event_demo_pickleball".

On your first message, introduce yourself briefly. Then:
- Keep responses brief and conversational
- ALWAYS query the database when a user mentions wanting to meet with someone
- Use getFriends tool first to check if the person is in their network
- If getFriends returns an empty array OR if a specific person is not in their network:
  * Ask the user to add those people to their network
  * Say something like: "I don't have Pete, Janet, and Phil in your network yet. Can you add them to your network so I can check their availability?"
  * Do NOT proceed without them being added to your network
- If the person IS in their network, use findOverlap to find overlapping free times with eventId="event_demo_pickleball"
- When using findOverlap, infer durationMinutes from context (default to 60 minutes)
- Always call suggestTimes with specific time options when you find availability - never just say "I can help"
- Never assume availability - always look it up in the database first
- Be proactive: suggest times first, ask follow-ups second

Today's date is ${new Date().toISOString().split("T")[0]}.`,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
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
          console.log(`[TOOL] suggestTimes called with ${times.length} times:`, times);
          console.log(`[TOOL] suggestTimes message:`, message);
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
          console.log("[TOOL] getFriends called");
          try {
            const friendsSnapshot = await db
              .collection("network")
              .doc(CURRENT_USER_ID)
              .collection("friends")
              .where("status", "==", "accepted")
              .get();

            const friendIds = friendsSnapshot.docs.map((doc) => doc.id);

            // Fetch friend details from users collection
            const friends = await Promise.all(
              friendIds.map(async (friendId) => {
                const userDoc = await db.collection("users").doc(friendId).get();
                const userData = userDoc.data();
                return {
                  id: friendId,
                  name: userData?.name || "Unknown",
                  email: userData?.email || "",
                };
              })
            );

            console.log(`[TOOL] getFriends returned ${friends.length} friends:`, friends);
            return friends;
          } catch (error) {
            console.error("[TOOL] getFriends error:", error);
            throw error;
          }
        },
      }),

      getSchedule: tool({
        description:
          "Get a user's availability for an event (busy blocks and free windows)",
        inputSchema: z.object({
          userId: z.string().describe("The user ID to get schedule for"),
          eventId: z.string().describe("The event ID to get availability for"),
        }),
        execute: async ({ userId, eventId }) => {
          console.log(`[TOOL] getSchedule called for userId=${userId}, eventId=${eventId}`);
          try {
            const availDoc = await db
              .collection("events")
              .doc(eventId)
              .collection("availability")
              .doc(userId)
              .get();

            if (!availDoc.exists) {
              console.log(`[TOOL] getSchedule: no availability data found`);
              return { userId, eventId, busyBlocks: [], freeWindows: [] };
            }

            const data = availDoc.data();
            console.log(`[TOOL] getSchedule returned:`, { userId, eventId, busyBlocks: data?.busyBlocks?.length || 0, freeWindows: data?.freeWindows?.length || 0 });
            return {
              userId,
              eventId,
              busyBlocks: data?.busyBlocks || [],
              freeWindows: data?.freeWindows || [],
              source: data?.source,
            };
          } catch (error) {
            console.error(`[TOOL] getSchedule error:`, error);
            throw error;
          }
        },
      }),

      findOverlap: tool({
        description:
          "Find overlapping free time slots between multiple users for a meeting",
        inputSchema: z.object({
          userIds: z
            .array(z.string())
            .describe("List of user IDs to find overlap for"),
          eventId: z.string().describe("The event ID to search availability within"),
          durationMinutes: z
            .number()
            .describe("Required meeting duration in minutes"),
        }),
        execute: async ({ userIds, eventId, durationMinutes }) => {
          console.log(`[TOOL] findOverlap called for userIds=${userIds.join(",")}, eventId=${eventId}, duration=${durationMinutes}min`);
          try {
            // Fetch availability for all users
            const availabilityDocs = await Promise.all(
              userIds.map((uid) =>
                db
                  .collection("events")
                  .doc(eventId)
                  .collection("availability")
                  .doc(uid)
                  .get()
              )
            );

            // Get free windows for each user
            const userFreeWindows = availabilityDocs
              .map((doc, idx) => ({
                userId: userIds[idx],
                windows: doc.data()?.freeWindows || [],
              }))
              .filter((u) => u.windows.length > 0);

            console.log(`[TOOL] findOverlap: ${userFreeWindows.length}/${userIds.length} users have availability`);

            if (userFreeWindows.length < userIds.length) {
              console.log(`[TOOL] findOverlap: not all users have availability`);
            }

            // Find overlapping time ranges
            const highQualityWindows = userFreeWindows.map((u) =>
              u.windows.filter((w) => w.quality === "high")
            );

            const overlap = highQualityWindows
              .reduce((acc, windows) => {
                if (acc.length === 0) return windows;
                return acc.filter((slot) =>
                  windows.some(
                    (w) =>
                      new Date(slot.start) < new Date(w.end) &&
                      new Date(slot.end) > new Date(w.start)
                  )
                );
              }, [] as any[])
              .slice(0, 3);

            if (overlap.length === 0) {
              console.log(`[TOOL] findOverlap: no overlapping time found`);
              return {
                suggestedSlots: [],
                searchedUsers: userIds,
                duration: durationMinutes,
                message: "No common free time found",
              };
            }

            const suggestedSlots = overlap.map((w) => ({
              start: w.start,
              end: w.end,
              availableFor: userIds,
              confidence: "high",
            }));

            console.log(`[TOOL] findOverlap found ${suggestedSlots.length} overlapping slots`);
            return {
              suggestedSlots,
              searchedUsers: userIds,
              duration: durationMinutes,
            };
          } catch (error) {
            console.error(`[TOOL] findOverlap error:`, error);
            throw error;
          }
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
