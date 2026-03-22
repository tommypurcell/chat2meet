# Architecture

## Request Flow

1. Browser loads App Router pages from `app/` (Left nav, Center Chat, Right Calendar).
2. The user chats via `components/chat/ChatContent.tsx`. 
3. The prompt is sent to `app/api/chat/route.ts` which uses the **Vercel AI SDK** and **Gemini 2.0**.
4. The Agent evaluates the request, decides to trigger server-side tools (e.g. `checkAvailability`).
5. Tool execution hits `lib/server/calendar-availability-core.ts` which merges the user's Ghost Grid constraints from Firestore with their live Google Calendar data (filtered precisely by their `selectedCalendarId`).
6. The Agent synthesizes the merged availability and streams a conversational proposal back.

## AI & Agentic Core (`app/api/chat`)

- Uses `streamText` and `generateText` from the Vercel AI SDK.
- Configured with strict `system` prompts to enforce the Chat2meet mission (avoiding manual grid negotiation).
- **Tool Calling:** Tools are defined for checking networks, fetching Google Calendar data, and booking events directly. 

## Calendar Integration (`lib/calendar-server.ts`)

- Stores encrypted OAuth2 `access_token` and `refresh_token` in Firestore (`users/{uid}/calendarAccounts`).
- Includes a sophisticated **Calendar Selection** process in `app/settings/page.tsx` allowing the endpoint to bypass the raw `"primary"` calendar and fetch events from specific `selectedCalendarId` lists dynamically.

## Firebase Admin

### `lib/firebase-credential.ts`
Single place for **how** the server authenticates to Firebase.

### `lib/firebase-admin.ts`
- **`getDb()`** — Firestore (initializes the default app with `getAdminCredential()`)
- **`getAuth()`** — Admin Auth handles session validation.

## Availability Core (`lib/server/calendar-availability-core.ts`)

The algorithm driving Chat2meet:
1. Fetches user's `ghostGrid` preferences.
2. Fetches the exact Google Calendar events for the timeframe using `selectedCalendarId`.
3. Checks intersections of multi-user network schedules.
4. Returns the boolean availability maps (`SlotCandidate` / `TimeRange`) for the AI to parse.
