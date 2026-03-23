import { google } from "@ai-sdk/google";
import { streamText, tool, convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import { z } from "zod";
import { getAuth, getDb } from "@/lib/firebase-admin";
import { FIREBASE_SESSION_COOKIE } from "@/lib/auth-session";
import { cookies } from "next/headers";
import { AGENT_PLAIN_TEXT_OUTPUT_RULES } from "@/lib/agent-plain-text-prompt";
import {
  calendarDateInTimeZone,
  formatLocalDateTimeForPrompt,
} from "@/lib/date-in-timezone";

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  // Get authenticated user
  let currentUserId: string | null = null;
  let userName = "there";
  let userTimeZone = "America/Los_Angeles";
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
        const tz = data?.timezone;
        if (typeof tz === "string" && tz.trim()) userTimeZone = tz.trim();
      }
    }
  } catch (e) {
    console.error("Error fetching user for onboarding:", e);
  }

  const now = new Date();

  const result = streamText({
    model: google(process.env.GEMINI_MODEL || "gemini-3-flash-preview"),
    system: `You are the Chat2meet onboarding assistant. Your job is to help someone get started through a brief, friendly conversation.

The user's name is: ${userName}

**Conversation Flow:**

1. **First message**: "Hey ${userName === "there" ? "" : userName + " "}— I can help you find the best time to meet people without the back-and-forth. Quick setup?"

2. **If they say yes or agree**: Ask about timezone first if not obvious: "What timezone are you in?" (or suggest "I'll use ${userTimeZone} if that's right.")

3. **Then ask about any scheduling rules** (all in ONE message): "Any scheduling rules I should remember? Like 'no meetings before 10 AM' or 'weeknights only' or 'prefer weekends'. Totally optional!"

4. **Use smart defaults if they don't give specifics**:
   - Start time: 9 AM
   - End time: 5 PM
   - Max length: 30 min
   - Days: weekdays only
   - Private preferences: whatever they mentioned

5. **After gathering info**: Call savePreferences, then say "You're set! Want to connect Google Calendar now to see your free times, or skip for now?"

6. **Then immediately**: Call completeOnboarding and suggest first action: "Ready to schedule something? Try 'find time with Rae this week' or 'when are 5 of us free this weekend'."

**Critical rules:**
- Keep messages SHORT (1-2 sentences max)
- NEVER ask more than 2 questions at once
- Don't make it feel like a form - make it conversational
- Use defaults liberally - don't force them to answer everything
- Move FAST toward the first real scheduling action

The user's timezone is ${userTimeZone}. Current time: ${formatLocalDateTimeForPrompt(now, userTimeZone)}.

${AGENT_PLAIN_TEXT_OUTPUT_RULES}`,
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
