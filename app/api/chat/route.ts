import { google } from "@ai-sdk/google";
import { streamText, tool, convertToModelMessages, type UIMessage } from "ai";
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
      system: `You are When2Meet Agent, a smart scheduling assistant. Be warm, friendly, and conversational.

Your job:
1. On first message: Introduce yourself warmly in 1-2 sentences
2. When user mentions an activity or event: Suggest the best friend based on their public statement (who would enjoy it most)
3. When user wants to schedule with specific people: Call findOverlap to find available times
4. Always ask for meeting duration if not mentioned
5. Show up to 3 best time slots in this format: "6:00 PM - 8:00 PM Tue Mar 24 ✓"

When suggesting friends for an activity, look at their public statements and pick who matches best.
When scheduling with specific people, use the 'id' field from getFriends results - these are the correct user IDs (e.g., user_pete, user_janet).
Always be warm and conversational - 2-4 sentences max per response.

Today's date is ${new Date().toISOString().split("T")[0]}.
Current event: "event_demo_pickleball"`,
      messages: await convertToModelMessages(messages),
      tools: {
        getFriends: tool({
          description: "Get the current user's list of friends with their public statements and interests",
          inputSchema: z.object({}),
          execute: async () => {
            console.log("[TOOL] getFriends called");
            try {
              const usersSnapshot = await db.collection("users").get();
              const users = new Map(usersSnapshot.docs.map((doc) => [doc.id, doc.data()]));

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
                    publicStatement: friendUser?.publicStatement || "",
                  };
                });

              console.log(`[TOOL] getFriends returned ${friends.length} friends`);
              friends.forEach((f) => console.log(`  - ${f.name} (${f.id}): "${f.publicStatement}"`));
              return friends;
            } catch (error) {
              console.error("[TOOL] getFriends error:", error);
              return [];
            }
          },
        }),

        findOverlap: tool({
          description: "Find available meeting times for specific people",
          inputSchema: z.object({
            userIds: z.array(z.string()).describe("List of user IDs to schedule with"),
            eventId: z.string().describe("Event ID (use event_demo_pickleball)"),
            durationMinutes: z.number().describe("Meeting duration in minutes"),
          }),
          execute: async ({ userIds, eventId, durationMinutes }) => {
            console.log(`[TOOL] findOverlap called`);
            console.log(`  userIds: ${JSON.stringify(userIds)}`);
            console.log(`  eventId: ${eventId}`);
            console.log(`  durationMinutes: ${durationMinutes}`);
            const t0 = Date.now();

            try {
              // Fetch availability for all users
              const availabilityDocs = await Promise.all(
                userIds.map((uid) => {
                  console.log(`  [FETCH] Fetching availability for ${uid}`);
                  return db
                    .collection("events")
                    .doc(eventId)
                    .collection("availability")
                    .doc(uid)
                    .get()
                    .then((doc) => {
                      const data = {
                        userId: uid,
                        freeWindows: doc.data()?.freeWindows || [],
                        found: doc.exists,
                      };
                      console.log(`    [GOT] ${uid}: ${data.freeWindows.length} windows, exists=${data.found}`);
                      return data;
                    });
                })
              );

              // Find overlapping high-quality slots
              const userFreeWindows = availabilityDocs
                .map((data) => ({
                  userId: data.userId,
                  windows: data.freeWindows.filter((w: any) => w.quality === "high"),
                }))
                .filter((u) => u.windows.length > 0);

              if (userFreeWindows.length < userIds.length) {
                console.log(`[TOOL] findOverlap: not all users have availability`);
              }

              // Find overlapping times
              const overlap = userFreeWindows
                .reduce((acc: any[], u) => {
                  if (acc.length === 0) return u.windows;
                  return acc.filter((slot) =>
                    u.windows.some(
                      (w: any) =>
                        new Date(slot.start) < new Date(w.end) &&
                        new Date(slot.end) > new Date(w.start)
                    )
                  );
                }, [])
                .slice(0, 3);

              console.log(`[TOOL] findOverlap found ${overlap.length} slots in ${Date.now() - t0}ms`);
              overlap.forEach((slot, i) => console.log(`  [${i + 1}] ${slot.start}`));

              return {
                slots: overlap.map((w) => ({ start: w.start, end: w.end })),
                count: overlap.length,
              };
            } catch (error) {
              console.error("[TOOL] findOverlap error:", error);
              return { slots: [], count: 0 };
            }
          },
        }),
      },
    });

    console.log("[CHAT] Streaming response...");
    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("[CHAT] ERROR:", error);
    return new Response(
      JSON.stringify({
        error: "Chat request failed",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
