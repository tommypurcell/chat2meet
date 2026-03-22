import { google } from "@ai-sdk/google";
import { streamText, tool, convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import { z } from "zod";
import { getAuth, getDb } from "@/lib/firebase-admin";
import { FIREBASE_SESSION_COOKIE } from "@/lib/auth-session";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  // Get authenticated user
  let currentUserId: string | null = null;
  let userName = "there";
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
        userName = data?.name || data?.displayName || decoded.name || "there";
      }
    }
  } catch (e) {
    console.error("Error fetching user for onboarding:", e);
  }

  const result = streamText({
    model: google(process.env.GEMINI_MODEL || "gemini-2.5-flash"),
    system: `You are the Chat2meet onboarding assistant. Your job is to welcome a new user and help them set up their account through a friendly, conversational flow.

The user's name is: ${userName}

Your goals in order:
1. Greet them warmly and briefly explain that Chat2meet helps them schedule meetings by chatting — it connects to Google Calendar and finds free times.
2. Ask about their scheduling preferences through natural conversation. You need to learn:
   - What time they prefer to start meetings (earliest hour, e.g. "9 AM")
   - What time they want to stop having meetings (latest hour, e.g. "5 PM")
   - Preferred meeting length (15, 30, 45, or 60 minutes)
   - Which days they're available for meetings (weekdays only? include weekends?)
   - Any private preferences they don't want others to see (e.g. "never schedule with David", "no meetings on Fridays after 2 PM", "prefer mornings")
3. Once you have enough info, call savePreferences to save everything.
4. After saving, tell them to connect their Google Calendar using the button that will appear, and let them know they can start scheduling right away.

Guidelines:
- Be brief and conversational — 1-2 sentences per message
- Ask about 2-3 things at once to keep it fast, don't ask one question at a time
- If they give short answers, fill in reasonable defaults and confirm
- Make it feel like chatting with a friend, not filling out a form
- You can use reasonable defaults: 9 AM start, 5 PM end, 30 min meetings, weekdays only
- After saving preferences, call completeOnboarding

Today's date is ${new Date().toISOString().split("T")[0]}.`,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools: {
      savePreferences: tool({
        description: "Save the user's scheduling preferences and private rules to their account. Call this once you've gathered their preferences from the conversation.",
        inputSchema: z.object({
          noMeetingsBefore: z.string().describe("Earliest meeting time, e.g. '09:00'"),
          noMeetingsAfter: z.string().describe("Latest meeting time, e.g. '17:00'"),
          maxMeetingLength: z.number().describe("Max meeting length in minutes (15, 30, 45, or 60)"),
          preferredDays: z.array(z.string()).describe("Array of preferred day names, e.g. ['monday','tuesday','wednesday','thursday','friday']"),
          publicPreferences: z.string().describe("Summary of public preferences others can see, e.g. 'Available weekdays 9-5, prefers 30-min meetings'"),
          privatePreferences: z.string().describe("Private preferences only the AI agent can see, e.g. 'Avoid meetings with David, no Friday afternoons'"),
        }),
        execute: async ({ noMeetingsBefore, noMeetingsAfter, maxMeetingLength, preferredDays, publicPreferences, privatePreferences }) => {
          if (!currentUserId) {
            return { success: false, error: "User not authenticated" };
          }
          try {
            const db = getDb();
            await db.collection("users").doc(currentUserId).set({
              preferences: {
                noMeetingsBefore,
                noMeetingsAfter,
                maxMeetingLength,
                preferredDays,
                public: publicPreferences,
                private: privatePreferences,
              },
              onboardingCompleted: false,
              updatedAt: new Date(),
            }, { merge: true });

            return { success: true, message: "Preferences saved successfully" };
          } catch (err) {
            console.error("Failed to save preferences:", err);
            return { success: false, error: "Failed to save preferences" };
          }
        },
      }),

      completeOnboarding: tool({
        description: "Mark onboarding as complete. Call this after preferences have been saved and you've told the user about connecting their calendar.",
        inputSchema: z.object({}),
        execute: async () => {
          if (!currentUserId) {
            return { success: false, error: "User not authenticated" };
          }
          try {
            const db = getDb();
            await db.collection("users").doc(currentUserId).set({
              onboardingCompleted: true,
              updatedAt: new Date(),
            }, { merge: true });

            return { success: true };
          } catch (err) {
            console.error("Failed to complete onboarding:", err);
            return { success: false, error: "Failed to complete onboarding" };
          }
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
