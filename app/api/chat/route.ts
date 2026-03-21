import { google } from "@ai-sdk/google";
import { streamText, tool, convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import { z } from "zod";
import { getDb } from "@/lib/firebase-admin";

const CURRENT_USER_ID = "user_rae";
const EVENT_ID = "event_demo_pickleball";

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();
    const db = getDb();

    console.log(`[CHAT] New request with ${messages.length} messages`);
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      console.log(`[CHAT] Last message:`, lastMsg.role, lastMsg.parts?.[0]);
    }

    const result = streamText({
      model: google("gemini-2.5-flash-lite"),
      onError: (error) => {
        console.error("[STREAM] Error in streamText:", error);
      },
      system: `You are When2Meet Agent, a smart scheduling assistant here to help users find the perfect time to meet with their friends and colleagues. Be warm, friendly, and conversational while staying focused and helpful.

Your primary goal is scheduling, but you can handle casual conversation naturally. If someone asks an off-topic question, answer it briefly and friendly, then gently guide them back to scheduling (e.g., "Speaking of which, are you planning to meet up with anyone soon?").

The current event ID is "event_demo_pickleball".

Workflow - EXECUTE THESE STEPS IMMEDIATELY:
1. On first message: ALWAYS generate a warm intro text response (1-2 sentences)
2. When user asks for a friend suggestion (e.g., "suggest a friend for hiking"):
   a) IMMEDIATELY call suggestFriend with the activity
   b) GENERATE TEXT: "I think [Friend] would be perfect for [activity]! Their interests: [publicStatement]"
   c) Then GENERATE TEXT asking about duration
3. When user mentions meeting/scheduling:
   a) IMMEDIATELY call getFriends - this returns all your friends with their public statements
   b) AFTER getFriends returns, GENERATE TEXT acknowledging the people mentioned
   c) If duration not mentioned: GENERATE TEXT asking "How long should this meeting be?"
   d) If duration IS mentioned: IMMEDIATELY call findOverlap with those userIds, the duration
   e) AFTER findOverlap returns: GENERATE TEXT with up to 3 best options in format: "Perfect! I found some great times:\n- 6:00 PM - 8:00 PM Tue Mar 24 ✓\n- ..."

CRITICAL: Always generate text responses between tool calls - never just call a tool and go silent!

CRITICAL RULES - FOLLOW THESE EXACTLY:
- NEVER say "let me check" or "let me look" - just DO the action immediately by calling the tool
- When you have: specific people + duration = IMMEDIATELY call findOverlap, NO DELAYS
- Extract user IDs from the friend names (e.g., "Pete" -> find user_pete in getFriends results)
- NO "I'll help you find times" - actually FIND and DISPLAY the times

TONE & STYLE:
- Be warm and conversational, 2-4 sentences max per response
- Use friendly language: "Great!", "Perfect!", "I found some great options!", "Here's what works:"
- If you find overlapping times, FORMAT AND DISPLAY THEM prominently in your response

Today's date is ${new Date().toISOString().split("T")[0]}.`,
      messages: await convertToModelMessages(messages),
      maxSteps: 20,
      tools: {
        getFriends: tool({
          description: "Get the current user's list of friends and contacts with their public statements",
          inputSchema: z.object({}),
          execute: async () => {
            console.log("[TOOL] getFriends called");
            try {
              // Fetch users
              const usersSnapshot = await db.collection("users").get();
              const users = new Map(usersSnapshot.docs.map((doc) => [doc.id, doc.data()]));

              // Fetch current user's friends
              const friendsSnapshot = await db
                .collection("network")
                .doc(CURRENT_USER_ID)
                .collection("friends")
                .get();

              const friends = friendsSnapshot.docs
                .filter((doc) => doc.data().status === "accepted")
                .map((doc) => {
                  const friendUser = users.get(doc.id);
                  return {
                    id: doc.id,
                    name: friendUser?.name || "Unknown",
                    email: friendUser?.email || "",
                    publicStatement: friendUser?.publicStatement || "No public statement",
                  };
                });

              console.log(`[TOOL] getFriends returning ${friends.length} friends`);
              friends.forEach((f) => console.log(`  - ${f.name}: "${f.publicStatement}"`));
              return friends;
            } catch (error) {
              console.error("[TOOL] getFriends error:", error);
              return [];
            }
          },
        }),

        suggestFriend: tool({
          description: "Find the best friend to invite based on an activity or interest",
          inputSchema: z.object({
            activity: z.string().describe("The activity or interest (e.g., 'hiking', 'coffee', 'gaming')"),
          }),
          execute: async ({ activity }) => {
            console.log(`[TOOL] suggestFriend called for activity="${activity}"`);
            try {
              // Fetch users
              const usersSnapshot = await db.collection("users").get();
              const users = new Map(usersSnapshot.docs.map((doc) => [doc.id, doc.data()]));

              // Fetch current user's friends
              const friendsSnapshot = await db
                .collection("network")
                .doc(CURRENT_USER_ID)
                .collection("friends")
                .get();

              const friends = friendsSnapshot.docs
                .filter((doc) => doc.data().status === "accepted")
                .map((doc) => {
                  const friendUser = users.get(doc.id);
                  return {
                    id: doc.id,
                    name: friendUser?.name || "Unknown",
                    email: friendUser?.email || "",
                    publicStatement: friendUser?.publicStatement || "",
                  };
                });

              // Score friends based on activity match in their public statement
              const scored = friends
                .map((friend) => {
                  const statement = friend.publicStatement.toLowerCase();
                  const activityLower = activity.toLowerCase();
                  const score = statement.includes(activityLower) ? 10 : statement.length > 0 ? 1 : 0;
                  return { ...friend, score };
                })
                .sort((a, b) => b.score - a.score);

              const topSuggestion = scored[0];
              console.log(`[TOOL] suggestFriend: top match is ${topSuggestion.name} (score: ${topSuggestion.score})`);

              return {
                suggestedFriend: topSuggestion,
                allScored: scored.slice(0, 3),
              };
            } catch (error) {
              console.error("[TOOL] suggestFriend error:", error);
              throw error;
            }
          },
        }),

        findOverlap: tool({
          description: "Find overlapping free time slots between multiple users for a meeting",
          inputSchema: z.object({
            userIds: z
              .array(z.string())
              .describe("List of user IDs to find overlap for"),
            eventId: z.string().describe("The event ID to search availability within"),
            durationMinutes: z.number().describe("Required meeting duration in minutes"),
          }),
          execute: async ({ userIds, eventId, durationMinutes }) => {
            console.log(
              `[TOOL] findOverlap called for userIds=${userIds.join(",")}, eventId=${eventId}, duration=${durationMinutes}min`
            );
            const t0 = Date.now();
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
                    .then((doc) => ({
                      userId: uid,
                      eventId,
                      busyBlocks: doc.data()?.busyBlocks || [],
                      freeWindows: doc.data()?.freeWindows || [],
                    }))
                )
              );

              // Get free windows for each user
              const userFreeWindows = availabilityDocs
                .map((data) => ({
                  userId: data.userId,
                  windows: data.freeWindows || [],
                }))
                .filter((u) => u.windows.length > 0);

              console.log(`[TOOL] findOverlap: ${userFreeWindows.length}/${userIds.length} users have availability`);

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

              const elapsed = Date.now() - t0;
              console.log(`[TOOL] findOverlap found ${suggestedSlots.length} overlapping slots (${elapsed}ms):`);
              suggestedSlots.forEach((slot, i) => {
                console.log(`  [${i + 1}] ${slot.start} - ${slot.end}`);
              });

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

    console.log("[CHAT] Starting to stream response...");
    const response = result.toUIMessageStreamResponse();
    console.log("[CHAT] Stream response created and returned");
    return response;
  } catch (error) {
    console.error("[CHAT] ERROR in POST handler:", error);
    // Return error response that will be visible to user
    return new Response(
      JSON.stringify({
        error: "Failed to process chat request. Please try again.",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" }
      }
    );
  }
}
