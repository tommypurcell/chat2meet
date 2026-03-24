# Agent flow & instructions

How the **scheduling agents** are prompted and how each **route** differs. **Source of truth:** `app/api/chat/route.ts`, `app/api/test-chat/route.ts`, `app/api/onboarding/chat/route.ts`, and `lib/agent-plain-text-prompt.ts`.

---

## Shared rules (all product chat agents)

### Plain text only (`lib/agent-plain-text-prompt.ts`)

Every agent that appends **`AGENT_PLAIN_TEXT_OUTPUT_RULES`** must:

- Reply in **plain text** — no Markdown (no `**`, `#`, `-` bullets, `` `code` ``, links in `[]()`, fences, HTML).
- Use short paragraphs or numbered lines like `1) …`.
- Pass **plain text** into tool fields meant for the user (e.g. `suggestTimes` explanation).

### Relative dates & timezones

**Production chat** (`/api/chat`) injects a **Relative Dates** section via `buildRelativeDatePromptSection`:

- Assumed **IANA timezone** (from request `userTimezone`, else user doc, else `America/Los_Angeles`).
- **Local calendar date** and **local time** in that zone — the model must interpret “today”, “tomorrow”, “this weekend”, “next Monday” from that context, **not** from UTC.

**Logged-in mode:** If the user uses a relative date before timezone is clear, the prompt can require pausing to confirm (e.g. “Just to confirm, should I treat today as …?”).

**Guest mode:** Stricter — confirmation questions about timezone/date must be **their own message** (no combining with the next scheduling question).

---

## Main app chat — `POST /api/chat`

**Model:** `google("gemini-3-flash-preview")` (fixed in code; other env-based overrides may exist elsewhere).

**Loop control:** `stopWhen: stepCountIs(5)` — at most **5** agent steps (tool rounds + text) per request.

### Who is the “current user”?

Resolved in order:

1. **Session cookie** (`getSessionUserId`) — if present, this uid wins (body uid mismatch is logged and ignored).
2. Else **`currentUserId`** from the JSON body (client Firebase uid).
3. Else **`defaultDevUserId()`** for local/dev.

**Guest vs logged-in** is **`sessionUserId !== null`**. Body-only uid still counts as **guest** for system prompt purposes (no session).

### What the server puts in context (logged-in only)

| Block | Purpose |
| --- | --- |
| **Current User** | Firebase uid in prompt |
| **Timezone + “today”** | `userTimezone`, local date, local time |
| **Relative dates section** | As above |
| **User’s Google Calendar** | From `calendarContext` body string **or** server fetch of connected Google account (~7 days) |
| **Demo network calendars** | `formatMockNetworkCalendarsForPrompt` — Janet, Pete, Phil, etc. |
| **People to schedule with** | If `schedulingParticipants` non-empty: names, emails, and **memberUserId** for tools; rules say not to ask user for raw ids |

**Guest mode** does **not** receive the calendar or demo-network blocks — only guest instructions + relative dates (with stricter confirmation) + plain-text rules.

### Logged-in agent: role & flow

**Identity:** “Chat2Meet Agent, a smart scheduling assistant” — help find times with friends/colleagues.

**Style:**

- **Very short** replies (1–3 sentences), texting tone.
- **First message:** one-sentence intro.

**Scheduling logic (high level):**

- **Own availability:** Use **User’s Google Calendar** + **Computed availability** sections; never claim “free all day” if busy blocks exist.
- **Demo people:** Use embedded mock schedules or **`getSchedule`** / **`findOverlap`** with ids `janet`, `pete`, `phil` (or legacy `user_janet`, …). Demo window documented in prompt (**Mar 15–29, 2026**, `America/Los_Angeles`).
- **Existing polls:** If user pastes link/id and asks about the poll → **`getEventPoll`** first. To show grid in chat → **`showEventPoll`**.
- **Suggestions:** Call **`suggestTimes`** when surfacing concrete options (chips in UI).
- **Google Calendar create:** **`createEvent`** only after **explicit user confirmation**; summarize title, time, attendees and ask “Should I create this?” first; then include Calendar link from result.

### Guest agent: role & flow (strict When2Meet-style)

**Identity:** “Chat2Meet Agent helping someone create a scheduling poll (like When2Meet).”

**No session** — prompt states there is no logged-in user.

**Interaction:** **One short question at a time**; don’t re-ask fields already answered; follow this **order**:

1. **Date window** — clarify range; if “next week” / “tomorrow” etc. already clear, don’t re-ask.
2. **Availability / time windows** — e.g. hours per day, before title/name.
3. **Same for all days?** — only if ambiguous.
4. **Meeting title**
5. **Their name** (shown on poll)
6. **Timezone** — last before create; **do not** call **`createGuestEvent`** until timezone is clear (or mappable).
7. **Create** — call **`createGuestEvent`** with dates, availability text, title, name, timezone; map recurring language to concrete `dateRangeStart` / `dateRangeEnd`; pass `earliestTime` / `latestTime` when user gave bounds.

**After successful create:**

- Short confirmation (e.g. poll ready below); **no** raw share URL in text if the card will show; **no** sign-up pitch in the same message.
- **Immediately** call **`showEventPoll`** with the new event id so the **EventPollCard** appears.

**Guest must not:**

- Mention `/network` or “Scheduling with”.
- Use **`getSchedule`**, **`findOverlap`**, **`createEvent`** unless the user has logged in — default path is **`createGuestEvent`** only.
- For **existing** poll questions: **`getEventPoll`** / **`showEventPoll`** as needed (same tools as logged-in).

### Tools registered on `/api/chat` (same object for both modes)

The server exposes one tool map; **guest** is steered by prompt not to use some of them.

| Tool | Role |
| --- | --- |
| `suggestTimes` | Return chip list + short plain-text explanation |
| `getFriends` | Scheduling participants if set, else mock connections |
| `getEventPoll` | Firestore snapshot: overlap, missing responders, top slots |
| `showEventPoll` | Same snapshot shaped for **EventPollCard** UI |
| `getSchedule` | Per-user calendar (Google or mock ids) |
| `findOverlap` | Common free slots across user ids |
| `createEvent` | Google Calendar create (logged-in; needs confirmation) |
| `createGuestEvent` | Create Firestore poll + share URL for guests |

---

## Test / demo chat — `POST /api/test-chat`

**Purpose:** Same UI patterns as home but **mock** calendar data only (no real Google on the prompt path for the “current user” block).

**Name in prompt:** “When2Meet Agent” (wording differs slightly from production).

**User id:** Body `currentUserId` or default **`user_phil`**.

**Calendar:** Built from **`MOCK_CALENDAR_EVENTS`** + **`formatMockNetworkCalendarsForPrompt`** (demo tz `America/Los_Angeles`).

**Extra emphasis:** Must call **`suggestTimes`** whenever recommending times (chips); on confirmed slot, **`createEvent`** (test/mock implementation — see route file).

**No** guest-mode split: always the “logged-in style” demo prompt.

---

## Onboarding — `POST /api/onboarding/chat`

**Model:** `process.env.GEMINI_MODEL` or `gemini-3-flash-preview`.

**Identity:** “Chat2meet onboarding assistant” — brief, friendly setup.

**User context:** From session cookie + Firestore user: **name**, **timezone**, current time in that zone.

**Scripted flow (prompt):**

1. First message template inviting quick setup.
2. If yes → timezone if unclear (or confirm stored timezone).
3. One message: scheduling rules (optional).
4. Defaults if vague: 9–5, 30 min, weekdays, etc.
5. Call **`savePreferences`** → then offer Google Calendar connect or skip.
6. Call **`completeOnboarding`** and suggest first scheduling phrases.

**Rules:** Short (1–2 sentences), max two questions at once, conversational not form-like, move fast to first scheduling action.

**Tools:**

| Tool | Role |
| --- | --- |
| `savePreferences` | Writes `preferences` object + `onboardingCompleted: false` (merge) |
| `completeOnboarding` | Sets `onboardingCompleted: true` |

Requires authenticated session; otherwise tools return error.

---

## Client inputs that affect the agent (`/api/chat`)

| Field | Effect |
| --- | --- |
| `messages` | Conversation (converted with `convertToModelMessages`) |
| `userTimezone` | Prompt “today” + relative-date section |
| `calendarContext` | Preformatted calendar markdown (preferred over server fetch) |
| `schedulingParticipants` | Scheduling block + `getFriends` / overlap defaults |
| `currentUserId` | Used when no session (and for calendar alignment with client) |

**Credentials:** Session-authenticated flows rely on **`credentials: "include"`** so the cookie is present.

---

## Related docs

| Doc | Topic |
| --- | --- |
| [calendar-agent-integration.md](./calendar-agent-integration.md) | Calendar context, heatmap, chips |
| [features.md](./features.md) | Product feature list |
| [api.md](./api.md) | HTTP contracts |

When you **change** system prompts or tool schemas, update this file and any **manual test** notes in [testing-agent-calendar.md](./testing-agent-calendar.md).
