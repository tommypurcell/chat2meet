import { google } from "@ai-sdk/google";
import { streamText, tool, convertToModelMessages, type UIMessage } from "ai";
import { z } from "zod";

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: google("gemini-2.0-flash-lite-preview-02-05"),
    system: `You are When2Meet Onboarding Agent.
Your goal is to help the user set up their account through a friendly conversation.

Follow this sequence:
1. Welcome them and ask them to connect their Google Calendar (mention it helps with automatic availability).
2. Once they are ready, ask for their "Public Preferences" (rules others see, e.g. "no meetings before 10 AM").
3. Then ask for their "Private Preferences" (secret rules only you know, e.g. "I never want to meet with Daniel").
4. Finally, tell them they are all set and can go to the home page.

- Keep responses warm and encouraging.
- If they ask how to connect calendar, tell them to click the "Connect Google Calendar" button that will appear.
- Use the 'completeOnboarding' tool when the process is finished.`,
    messages: await convertToModelMessages(messages),
    tools: {
      updatePreferences: tool({
        description: "Update the user's public or private preferences",
        inputSchema: z.object({
          type: z.enum(["public", "private"]),
          text: z.string().describe("The preference text"),
        }),
        execute: async ({ type, text }) => {
          console.log(`Updating ${type} preference: ${text}`);
          return { success: true };
        },
      }),
      completeOnboarding: tool({
        description: "Mark the onboarding as complete and redirect to home",
        inputSchema: z.object({}),
        execute: async () => {
          return { success: true, redirect: "/" };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
