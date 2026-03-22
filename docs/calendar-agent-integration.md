# Calendar Agent Integration

## Overview

The When2Meet Agent now has full access to real Google Calendar data and can intelligently find meeting times based on actual availability.

## Architecture

### Data Flow

```
Google Calendar API → Transform to Busy Blocks → Calculate Free Windows → Find Overlaps → LLM Explanation
```

**Key Principle**: The LLM never processes raw calendar data. Backend code does all the scheduling math.

## Components

### 1. Calendar Utilities (`lib/calendar-utils.ts`)

Pure functions for calendar math:

- **`eventsToBusyBlocks(events)`**: Converts Google Calendar events to simple busy time blocks
  - Filters out declined events
  - Filters out all-day events
  - Returns `{ start: ISO8601, end: ISO8601 }[]`

- **`mergeBusyBlocks(blocks)`**: Merges overlapping busy blocks
  - Consolidates adjacent/overlapping time blocks
  - Reduces complexity for free time calculation

- **`calculateFreeWindows(busyBlocks, rangeStart, rangeEnd)`**: Finds free time
  - Takes busy blocks and date range
  - Returns free windows split by working hours (9 AM - 5 PM default)
  - Assigns quality scores: `high`, `medium`, `low`

- **`findCommonFreeSlots(userAvailability, minDuration)`**: Finds overlapping free time
  - Takes availability for multiple users
  - Returns slots where people are available
  - Includes `availableUsers[]` and `unavailableUsers[]` for each slot

- **`formatSlotsForLLM(slots)`**: Human-readable summary for the agent

### 2. Availability API (`/api/calendar/availability`)

**Endpoint**: `POST /api/calendar/availability`

**Request Body**:
```json
{
  "userIds": ["user_tommy", "user_alice"],
  "startDate": "2026-03-24",
  "endDate": "2026-03-28",
  "minDuration": 60
}
```

**Response**:
```json
{
  "success": true,
  "slots": [
    {
      "start": "2026-03-24T14:00:00-07:00",
      "end": "2026-03-24T15:30:00-07:00",
      "availableUsers": ["user_tommy", "user_alice"],
      "unavailableUsers": []
    }
  ],
  "summary": "Available time slots:\n1. Mon Mar 24, 2:00 PM - 3:30 PM (90 min) - 2 available: user_tommy, user_alice",
  "userCount": 2
}
```

### 3. Agent Tools (`/api/chat/route.ts`)

The agent exposes scheduling tools (names may vary slightly by route; test-chat mirrors a subset). Typical set:

| Tool | Purpose |
| --- | --- |
| `getSchedule` | Events + busy blocks for a user/date range (Google or mock ids) |
| `findOverlap` | Common free slots across users |
| `getFriends` | Contacts for scheduling |
| `suggestTimes` | **Required for UI:** returns structured `{ id, time, date }[]` for chips + heatmap |
| `createEvent` | Create a Google Calendar event for the signed-in user (see route for schema) |

#### `getSchedule`

Fetches a user's Google Calendar events for a date range.

**Input**:
- `userId`: User ID (e.g., `"user_tommy"`)
- `startDate`: Start date in YYYY-MM-DD format
- `endDate`: End date in YYYY-MM-DD format

**Returns**:
```json
{
  "userId": "user_tommy",
  "events": [
    {
      "title": "Team Standup",
      "start": "2026-03-24T09:00:00-07:00",
      "end": "2026-03-24T09:30:00-07:00"
    }
  ],
  "busyBlocks": [
    {
      "start": "2026-03-24T09:00:00-07:00",
      "end": "2026-03-24T09:30:00-07:00"
    }
  ],
  "totalEvents": 5
}
```

#### `findOverlap`

Finds common free time slots between multiple users using real Google Calendar data.

**Input**:
- `userIds`: Array of user IDs
- `startDate`: Start date in YYYY-MM-DD format
- `endDate`: End date in YYYY-MM-DD format
- `durationMinutes`: Required meeting duration (default: 60)

**Returns**:
```json
{
  "suggestedSlots": [
    {
      "start": "2026-03-24T14:00:00-07:00",
      "end": "2026-03-24T15:00:00-07:00",
      "availableFor": ["user_tommy", "user_alice"],
      "unavailableFor": [],
      "durationMinutes": 60,
      "confidence": "high"
    }
  ],
  "searchedUsers": ["user_tommy", "user_alice"],
  "duration": 60,
  "totalSlotsFound": 8
}
```

## How It Works

### Example: "Schedule pickleball with Alice next week"

1. **User sends message** via chat interface

2. **Agent uses `getFriends` tool** to find Alice's user ID

3. **Agent uses `findOverlap` tool**:
   ```javascript
   findOverlap({
     userIds: ["user_tommy", "user_alice"],
     startDate: "2026-03-24",
     endDate: "2026-03-31",
     durationMinutes: 90
   })
   ```

4. **Backend fetches Google Calendar events** for both users:
   - Decrypts OAuth tokens
   - Calls Google Calendar API
   - Gets event lists for date range

5. **Backend transforms events** → **busy blocks**:
   ```javascript
   Tommy's busy: [
     { start: "2026-03-24T09:00", end: "2026-03-24T10:00" },
     { start: "2026-03-24T14:00", end: "2026-03-24T15:00" }
   ]

   Alice's busy: [
     { start: "2026-03-24T10:00", end: "2026-03-24T11:30" },
     { start: "2026-03-25T13:00", end: "2026-03-25T14:00" }
   ]
   ```

6. **Backend calculates free windows** for each user:
   ```javascript
   Tommy free: [
     { start: "2026-03-24T10:00", end: "2026-03-24T14:00", quality: "high" },
     { start: "2026-03-24T15:00", end: "2026-03-24T17:00", quality: "medium" }
   ]

   Alice free: [
     { start: "2026-03-24T09:00", end: "2026-03-24T10:00", quality: "high" },
     { start: "2026-03-24T11:30", end: "2026-03-24T17:00", quality: "high" }
   ]
   ```

7. **Backend finds overlaps**:
   ```javascript
   Common free: [
     { start: "2026-03-24T11:30", end: "2026-03-24T14:00", availableUsers: ["user_tommy", "user_alice"] },
     { start: "2026-03-24T15:00", end: "2026-03-24T17:00", availableUsers: ["user_tommy", "user_alice"] }
   ]
   ```

8. **Agent receives structured slots** (NOT raw calendar data):
   ```json
   {
     "suggestedSlots": [
       {
         "start": "2026-03-24T11:30:00-07:00",
         "end": "2026-03-24T13:00:00-07:00",
         "availableFor": ["user_tommy", "user_alice"],
         "durationMinutes": 90,
         "confidence": "high"
       }
     ]
   }
   ```

9. **Agent uses `suggestTimes` tool** to show options in UI:
   ```javascript
   suggestTimes({
     times: [
       {
         id: "slot1",
         time: "11:30 AM",
         date: "Tue Mar 24"
       },
       {
         id: "slot2",
         time: "3:00 PM",
         date: "Tue Mar 24"
       }
     ],
     message: "Both of you are free on Tuesday! Morning or afternoon work?"
   })
   ```

10. **User sees interactive time chips** in the chat (and the optional **heatmap** reads the same `suggestTimes` output)

## Chat transport, timezone, and prompts

- **Client → `POST /api/chat`:** Sends `messages` (UIMessage[]), optional **`calendarContext`** (markdown block built from `GET /api/calendar/google/events` on the client), optional **`schedulingParticipants`**, **`currentUserId`**, and **`userTimezone`** (IANA). The server uses **`userTimezone`** (or Firestore `users.timezone`) so **“today”** in the system prompt matches the user’s local calendar day—not UTC-only `toISOString()` dates.
- **Plain text:** `lib/agent-plain-text-prompt.ts` is appended to the system prompt so assistant replies avoid Markdown.
- **Default model:** `gemini-3-flash-preview` via `@ai-sdk/google` (override with `GEMINI_MODEL` where the route reads it).

## UI: tool results and chips / heatmap

AI SDK **v5** stores tool results on assistant messages under **`parts`** (e.g. `type: "tool-suggestTimes"`, `state: "output-available"`, `output: { suggestedTimes, explanation }`). Older code paths assumed **`message.toolResults`**, which is usually empty—**time chips and `AvailabilityHeatmap` would show nothing**. The app uses **`lib/chat-tool-outputs.ts`** (`extractSuggestedTimesFromMessages`, `extractCreateEventResultsFromMessages`) so both **`parts`** and any legacy **`toolResults`** shape work. Assistant **text** is merged with **`mergeUiMessageTextParts`** in `lib/utils.ts` to avoid duplicated paragraphs after multi-step tool runs.

## Firestore snapshot: `calendars/{uid}`

After a successful Google events fetch on the home page, the client calls **`POST /api/calendars/sync`** (session required) to upsert a snapshot document for debugging and future features. See [firebase-mvp.md](./firebase-mvp.md).

## Data Privacy

- **Scheduling math** (busy blocks, overlaps) runs on the **server**; the model receives **summaries** you put in the system prompt (e.g. formatted calendar markdown, computed free windows)—not raw OAuth tokens.
- **Google access tokens** are **encrypted** in Firestore (`users/.../calendarAccounts`) and **decrypted only on the server** for API calls.
- **End users:** treat calendar event text in prompts as sensitive; tighten logging in development routes if needed.

## Testing

### Test the agent with real calendar data:

1. **Connect Google Calendar** (see [google-calendar-setup.md](./google-calendar-setup.md)); you can use **`/test-calendar`** or the main app after sign-in.

2. **Start a chat** on the **home** page (`/`):
   - "When am I free this week?"
   - "Schedule coffee with Alice tomorrow"
   - "Find time for a 1-hour meeting next Monday"

3. **Agent will**:
   - Query your real Google Calendar
   - Find actual free times
   - Suggest specific slots based on real availability

### Example Queries

```text
"When am I free tomorrow?"
→ Agent calls getSchedule("user_tommy", "2026-03-25", "2026-03-25")
→ Shows your actual free windows

"Find time to meet with Bob and Carmen next week"
→ Agent calls findOverlap(["user_tommy", "user_bob", "user_carmen"], ...)
→ Returns only times when all 3 are available

"I need 2 hours for a workshop on Friday"
→ Agent calls findOverlap with durationMinutes: 120
→ Only shows 2+ hour blocks
```

## Advantages of This Approach

1. ✅ **LLM doesn't do math** - Backend handles all scheduling logic
2. ✅ **Privacy preserved** - Event details stay on backend
3. ✅ **Smaller prompts** - Only send summarized availability, not full event dumps
4. ✅ **Fewer bugs** - Deterministic code vs. probabilistic LLM reasoning
5. ✅ **Faster responses** - Pre-computed overlaps vs. LLM trial-and-error
6. ✅ **Accurate results** - Code always finds correct overlaps

## Future Enhancements

- [ ] Cache availability data per user to reduce API calls
- [ ] Support for preferred meeting times (user preferences)
- [ ] Deeper multi-timezone testing for distributed teams (partial: local “today” + IANA in prompts)
- [ ] Multi-calendar support (work + personal calendars)
- [ ] Smart suggestions based on meeting patterns
- [ ] Optional server-side chat history persistence
