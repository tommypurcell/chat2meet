# Features

Inventory of **what the app does today** (pages, APIs, agent capabilities, and integrations). For **every HTTP path and method**, see the route index in [api.md](./api.md). For architecture see [overview.md](./overview.md) and [architecture.md](./architecture.md).

**App Router pages** under `app/**/page.tsx` (19): `/`, `/login`, `/signin`, `/auth`, `/onboarding`, `/onboarding/preferences`, `/network`, `/addnetwork`, `/profile`, `/profile/[userId]`, `/settings`, `/calendar`, `/availability`, `/test-chat`, `/test-calendar`, `/events/[id]`, `/event/[id]`, `/invite/[id]`, `/join/[id]`.

---

## Scheduling & chat (core)

| Feature | Where / how |
| --- | --- |
| **Streaming AI chat** | `POST /api/chat` — Vercel AI SDK (default model configurable via env where documented, e.g. `GEMINI_MODEL`); UI via `useChat` + `DefaultChatTransport` (`app/page.tsx`, `app/test-chat/page.tsx`) |
| **Chat tools (logged-in + demo paths)** | `suggestTimes`, `getFriends`, `getSchedule`, `findOverlap`, `createEvent` (Google Calendar when connected) |
| **Guest poll creation** | `createGuestEvent` — Firestore event + share URL; stricter conversation order in system prompt (dates, times, title, availability, name, timezone) |
| **Existing poll in chat** | `getEventPoll` (inspect), `showEventPoll` (in-chat **EventPollCard** with overlap grid + copy link) |
| **Suggested time chips** | Parsed from tool outputs in `lib/chat-tool-outputs.ts` (AI SDK **`parts`**, not legacy `toolResults` only); selecting a chip can open **invite preview** (`InvitePreview` / sample invite flow on home) |
| **Assistant typing / streaming row** | Pending assistant message shows a bouncing-dot row in the inlined `ChatContent` on home |
| **Side panel: My Calendar** | Google events (`MyCalendarEvents`), resizable; fetches `GET /api/calendar/google/events`, sync via `POST /api/calendars/sync` |
| **Side panel: group heatmap** | `AvailabilityHeatmap` → `POST /api/calendar/heatmap` with selected user ids + range |
| **Scheduling participants bar** | In-memory list sent with chat requests; persisted in `lib/scheduling-storage.ts` |
| **`/network` in chat** | Command opens `NetworkPickerModal` (logged-in only) |
| **Clear chat** | Clears messages, `localStorage` transcript, slot/invite UI state (home) |
| **Persisted transcript (client)** | `localStorage` key `when2meet-agent-chat-messages` (`lib/chat-storage.ts`) |
| **Guest empty state** | Cards: Create an event, Connect calendar; quick-start pills; copy in `lib/guest-chat-starters.ts` |
| **Guest → account** | In-chat Google sign-in UI + optional email/password flows; then `POST /api/events/[eventId]/claim-guest`; `lib/guest-session.ts` keyed by `eventId` |
| **Test / demo chat** | `/test-chat` → `POST /api/test-chat` (mock-heavy calendars + relative-date prompt section) |
| **Signed-in empty state** | Suggestion cards from `CHAT_SUGGESTIONS` (`lib/mock-data.ts`); tablet/mobile also show demo **meeting groups** list |

---

## Home layout (`/`) — shells & chrome

| Feature | Where / how |
| --- | --- |
| **Responsive layouts** | **Desktop (lg+):** sidebar + chat + optional calendar/heatmap columns. **Tablet (md–lg):** narrow groups column + chat. **Mobile:** full-width chat + top nav |
| **Sidebar: recent events** | Logged-in: `GET /api/events?userId=…` → links to `/events/[id]` |
| **Sidebar: demo meeting groups** | `MEETING_GROUPS` mock list; updates `activeGroup` state (demo UX) |
| **Sidebar: New meeting** | Button present (UI) |
| **Screens / dev route menu** | `ROUTES` in `app/page.tsx` — jump links (onboarding, network, invite/join/event demos, etc.); theme toggle in header |
| **Header shortcuts (desktop)** | Availability heatmap toggle, My Calendar toggle, `/availability`, `/network`, profile or sign-up |
| **Network picker modal** | `NetworkPickerModal` from home when `/network` command or relevant flows; requires `user.uid` |

---

## Onboarding

| Feature | Where / how |
| --- | --- |
| **Onboarding chat** | `/onboarding` → `POST /api/onboarding/chat`; tools **`savePreferences`**, **`completeOnboarding`** |
| **Preferences UI (standalone)** | `/onboarding/preferences` — local form for days, hours, meeting length, visibility (prototype / not necessarily wired to API) |

---

## Authentication & session

| Feature | Where / how |
| --- | --- |
| **Firebase Auth (client)** | `lib/auth-context.tsx`, Google provider; email/password where implemented (e.g. guest upgrade flows on home) |
| **App login page** | `/login` — Google sign-in, `returnTo` query support, session exchange via `POST /api/auth/session` |
| **Legacy sign-in path** | `/signin` — redirects to `/login` |
| **Calendar OAuth return UI** | `/auth` — handles Google **Calendar** authorization code / errors (not the same as Firebase app login); works with `/api/auth/google` + callback |
| **Session cookie** | `POST /api/auth/session` (ID token → HTTP-only cookie); `GET /api/auth/me` |
| **Sign out** | `POST /api/auth/signout` or `POST /api/auth/logout` |
| **Google Calendar OAuth (API)** | `GET /api/auth/google`, `GET /api/auth/google/callback` plus `/api/calendar/google/*` (connect, disconnect, events, busy, heatmap, auth-url, calendars) |

---

## Users, profile, settings

| Feature | Where / how |
| --- | --- |
| **User CRUD** | `/api/users`, `/api/users/[userId]` |
| **Current user profile** | `/api/user`, `/api/user/[userId]` |
| **Availability preferences** | `/api/user/availability` |
| **Profile UI** | `/profile` (self), `/profile/[userId]` (other user) |
| **Settings** | `/settings` — Google Calendar **connect / disconnect** (`GoogleCalendarConnect`, `GoogleCalendarDisconnect`); redirects to `/login` if anonymous |

---

## Network & friends

| Feature | Where / how |
| --- | --- |
| **Connections (owner-centric)** | `/api/network`, `/api/network/[connectionId]` |
| **Friends list** | `/api/friends` |
| **Network page** | `/network` |
| **Add connection** | `/addnetwork` — opens `NetworkPickerModal` when signed in; otherwise prompts for login |

---

## Events & When2Meet-style polls

| Feature | Where / how |
| --- | --- |
| **Event CRUD** | `/api/events`, `/api/events/[eventId]` |
| **Participants subcollection** | `/api/events/[eventId]/participants`, `.../[userId]` |
| **Per-user availability** | `/api/events/[eventId]/availability`, `.../[userId]` |
| **Aggregated group availability** | `POST /api/events/[eventId]/group-availability` |
| **Claim guest poll after login** | `POST /api/events/[eventId]/claim-guest` |
| **Public event page** | `/events/[id]` — share, range, timezone, grids (`EventAvailabilityGrid`, `EventGroupHeatmap`) |
| **Layout styling** | `app/events/layout.tsx` — subtree uses `--bg-secondary` (see styleguide) |
| **Legacy / demo flows (distinct UIs)** | **`/invite/[id]`** — invite card, fetch `GET /api/events/[id]`, accept/decline/counter UX. **`/join/[id]`** — join gate (name/email/password fields + event fetch). **`/event/[id]`** — meeting detail, finalize/cancel via `PATCH /api/events/[id]`. All separate from the public **`/events/[id]`** poll page |

---

## Calendar (Google)

| Feature | Where / how |
| --- | --- |
| **OAuth connect / disconnect** | `/api/calendar/google/connect`, `disconnect`, `auth-url`, `calendars` |
| **List events** | `GET /api/calendar/google/events` |
| **Busy blocks** | `/api/calendar/google/busy` |
| **Per-user heatmap helper** | `/api/calendar/google/heatmap` |
| **Multi-user heatmap (app heatmap)** | `POST /api/calendar/heatmap` |
| **Server-side availability math** | `POST /api/calendar/availability` |
| **Persist snapshot to Firestore** | `POST /api/calendars/sync` → `calendars/{uid}` |
| **Dedicated calendar page** | `/calendar` — `CalendarView` + `CalendarHeatmap`; modes: month / week / day / heatmap |
| **Manual availability grid page** | `/availability` — `AvailabilityGrid` (full-page picker) |
| **Calendar dev page** | `/test-calendar` |

---

## Theming & UX chrome

| Feature | Where / how |
| --- | --- |
| **Light / dark** | `html[data-theme]` + `lib/theme.tsx`; tokens in `app/globals.css` |
| **Root layout** | `app/layout.tsx` — Inter (`next/font`), default theme on `<html>`, `antialiased` body |
| **Design tokens** | [styleguide.md](./styleguide.md) |
| **Dev screen menu** | Home sidebar: `ROUTES` + theme toggle. **Note:** `components/ui/DevNav.tsx` exists (FAB + route list) but is **not** mounted in `app/layout` today — home duplicates a similar route list |

---

## Operations & health

| Feature | Where / how |
| --- | --- |
| **Liveness** | `GET /api/health` |
| **DB seed** | `npm run db:seed` → `scripts/seed-firestore.ts` (see [setup.md](./setup.md), [firebase-mvp.md](./firebase-mvp.md)) |
| **Scripts in repo** | `scripts/` — `seed-firestore`, `verify-schema`, `load-env`, `export-firestore`, `clear-network`, `check-availability` (run with `tsx` as needed; only **`db:seed`** is an npm script) |

---

## API surface (completeness)

All **`app/api/**/route.ts`** handlers are enumerated in [api.md](./api.md). This doc does not duplicate every method; it maps **product features** to routes. If you add a new `route.ts`, update **api.md**, this file, and any relevant agent tool list.

---

## What not to break (when changing code)

Use this as a **regression checklist** for PRs that touch chat, auth, calendar, or events.

### Chat transport & agent

- **`DefaultChatTransport` body** sent from the client must keep working: `messages`, `schedulingParticipants`, `currentUserId`, `calendarContext`, `userTimezone` (and any other fields `app/api/chat/route.ts` reads). Breaking names or shapes **silently drops** calendar context or user identity.
- **Tool definitions and return shapes** used by the UI must stay compatible with **`lib/chat-tool-outputs.ts`** (`suggestTimes`, `createGuestEvent`, `showEventPoll`, etc.). The UI reads **AI SDK v5 `parts`** (`tool-*` / `dynamic-tool`), not only legacy `toolResults`.
- **Guest mode rules** in the system prompt (order of questions before `createGuestEvent`, no Google `createEvent` for anonymous users unless logged in) are **product constraints**—changing them without updating UX copy and flows will confuse users and tools.

### Auth & cookies

- **Session cookie** contract for protected routes: don’t rename or drop the cookie the API expects without updating **all** route handlers and the client `credentials: "include"` fetches.
- **`POST /api/auth/session`** must remain the bridge from Firebase client sign-in to server session for **claim-guest**, **calendar sync**, and profile routes.

### Calendar

- **Google OAuth redirect URIs** and token storage under `users/{uid}/calendarAccounts` must stay consistent with [google-calendar-setup.md](./google-calendar-setup.md); otherwise connect/disconnect and `getSchedule` / `createEvent` break.
- **`/api/calendars/sync`** and the **calendar prompt** built on the home page depend on the same event shape from `GET /api/calendar/google/events`.

### Events & Firestore

- **Event document fields** used by `/events/[id]`, grids, and tools (`participantIds`, `createdBy`, `shareUrl`, date range, timezone, optional `earliestTime` / `latestTime`) are assumed across API + UI.
- **Subcollections** `participants` and `availability` (doc id = `userId`) are required for **group heatmap**, **availability grid**, and **claim-guest** migration logic.
- **`claim-guest`** must only attach when the guest id matches **`createdBy`** or **`participantIds`**; don’t weaken checks without a security review.

### Client persistence & layout

- **`localStorage` keys**: `when2meet-agent-chat-messages` (chat), `when2meet_guest_sessions` (guest session map). Renaming without migration **orphans** user data.
- **Chat column flex layout**: the **`min-h-0` chain** on the home (and tablet/mobile) layout + scroll refs prevents the transcript from drawing **under** the scheduling bar and composer; removing `min-h-0` brings back **clipped last messages**.
- **Composer bar** uses **`--bg-secondary`** to match **`SchedulingParticipantsBar`**; reverting to **`--bg-primary`** in dark mode reintroduces a **harsh black strip** (`#000` vs `#1C1C1E`).

### Styling & a11y

- **Token-based colors** for themed UI: avoid replacing `var(--…)` with raw Tailwind palette on surfaces that must work in **light and dark** (see [styleguide.md](./styleguide.md) § Do / don’t).

### Documentation

- When adding a **user-visible feature** or **API route**, update **[api.md](./api.md)**, **[features.md](./features.md)** (this file), and **[components.md](./components.md)** or **[styleguide.md](./styleguide.md)** when UI patterns change.

---

## Related docs

| Doc | Use |
| --- | --- |
| [README.md](./README.md) | Index of all docs |
| [recent-changes.md](./recent-changes.md) | Audit of a recent feature batch |
| [calendar-agent-integration.md](./calendar-agent-integration.md) | Agent + calendar wiring |
| [firebase-mvp.md](./firebase-mvp.md) | Firestore shapes |
