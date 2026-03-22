# Testing Agent Calendar Access

## Setup verification

1. Sign in via the app (`/login`) so you have a real Firebase **`uid`** (not only seed ids).
2. Connect **Google Calendar** using the in-app flow; confirm `users/{uid}/calendarAccounts` has an active Google account in Firestore.
3. Open the **home** page (`/`) and send a chat message, or use **`/test-chat`** for mock-calendar-only behavior without relying on your live calendar.

## Test queries

Try these on **`/`** (production chat → `POST /api/chat`):

### 1. Check your own schedule

**Try:** “When am I free tomorrow?”

**What should happen:**

- Agent may call `getSchedule` with your **Firebase uid** (or demo ids like `janet` when using mock data).
- Response reflects **formatted calendar context** the client attached (`calendarContext`) or server-fetched events.

**Debug:**

- Browser must send **cookies** to `/api/chat` (`credentials: "include"`).
- If calendar block is missing, verify `GET /api/calendar/google/events?userId=…` works for your uid.

---

### 2. Check a date range

**Try:** “What’s on my calendar next week?”

**What should happen:**

- Agent pulls or reasons over the **next ~7 days** window used in the UI fetch.

---

### 3. Suggested times and chips

**Try:** “Suggest two meeting times this week for a 30-minute call.”

**What should happen:**

- Agent calls **`suggestTimes`** with `{ id, time, date }` entries.
- **Time chips** appear under the transcript; the **availability heatmap** (if open) highlights those slots.

**If chips or heatmap stay empty:** assistant messages must include tool **`parts`** (`tool-suggestTimes` with `output-available`). The UI uses `lib/chat-tool-outputs.ts` to read them—not legacy `toolResults`.

---

### 4. Multi-user / demo network

**Try:** “Find time for pickleball with Janet and Pete this week.”

**What should happen:**

- Agent uses **demo network calendars** from `lib/data.ts` and/or **`findOverlap`** with known demo user ids (`janet`, `pete`, …) as documented in the system prompt.

---

## Debugging

### “No calendar connected”

Firestore path:

`users/{yourUid}/calendarAccounts` → document with `provider: "google"`, `isActive: true`, encrypted tokens.

### Wrong “today” or timezone

Confirm the client sends **`userTimezone`** on chat requests (see `app/page.tsx`) and the user’s `timezone` in Firestore is set when possible.

### Firestore snapshot not appearing

After loading home with Google connected, check collection **`calendars/{yourUid}`** (from **`POST /api/calendars/sync`**). Run `npx tsx scripts/verify-schema.ts` to list calendar snapshots.

### Test-chat only

`/test-chat` uses **`POST /api/test-chat`** with **mock** calendar data (`lib/data.ts`). Use it to validate tool UX without touching Google.
