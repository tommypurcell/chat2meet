# Overview

## Intent

**When2Meet Agent** helps groups find meeting times using conversational flows and server-side scheduling logic (availability overlap, mock demo calendars, and optional Google Calendar). The primary UI is **chat** plus optional **My Calendar** and **availability heatmap** panels—not a manual When2Meet-style grid.

## Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Fonts:** [Inter](https://fonts.google.com/specimen/Inter) via `next/font` (`app/layout.tsx`)
- **Styling:** Tailwind CSS v4 (`app/globals.css`, CSS variables for theme)
- **AI:** Vercel AI SDK (`ai`, `@ai-sdk/react`, `@ai-sdk/google`) — streaming chat with tools; default model `gemini-3-flash-preview` (override with `GEMINI_MODEL` where supported)
- **Data:** Firebase **Firestore** (`users`, `network`, `events`, **`calendars`** snapshots, `users/{uid}/calendarAccounts`, …)
- **Server SDK:** `firebase-admin` with shared credential resolution in `lib/firebase-credential.ts`
- **Auth:** Firebase Auth in the browser + HTTP-only **session cookie** (`firebase_session`) for server routes; see `/api/auth/session`, `/api/auth/me`
- **Tooling:** ESLint (`eslint-config-next`), `tsx` for scripts, optional Firebase CLI (`firebase-tools`)

## Repository layout

```
app/                  # Pages, App Router, app/api/* route handlers
components/          # chat/, calendar/, sidebar/, events/, ui/
lib/                 # types, data/mocks, calendar-*, chat-*, firebase-*, format-calendar-for-prompt, etc.
scripts/             # load-env.ts, seed-firestore.ts, verify-schema.ts, …
docs/                # Project documentation
public/              # Static assets
```

## Frontend (high level)

- **Home (`app/page.tsx`):** Client layout with sidebar, **AI chat** (`useChat` + `DefaultChatTransport`), `ChatInput`, optional **My Calendar** column (`MyCalendarEvents`), optional **availability heatmap** (`AvailabilityHeatmap`). Chat transcript can persist in **localStorage** (`lib/chat-storage.ts`).
- **Test chat (`app/test-chat/page.tsx`):** Same chat UX against `/api/test-chat` with mock calendar data.
- **Chat UI:** `ChatContent` / inline chat blocks use `mergeUiMessageTextParts` for assistant text; **`ChatMessageText`** linkifies URLs with `--text-link`; **time chips** and **heatmap** read tool outputs via `lib/chat-tool-outputs.ts` (AI SDK **`parts`**).
- **Network:** `/network` page for connections; typing `/network` in chat opens a **view-only** network modal (`NetworkPickerModal`).
- **Events:** **`/events/[id]`** — event detail (share link, participants, CTA back to app). Wrapped by **`app/events/layout.tsx`** so the route uses **`--bg-secondary`** panel tones instead of bare **`--bg-primary`** for the full viewport.
- **Other routes:** Onboarding (`/onboarding`, `/onboarding/preferences`), auth (`/auth`, `/login`, `/signin`), profile (`/profile`, `/profile/[userId]`), calendar (`/calendar`), availability (`/availability`), settings (`/settings`), invite/join/event demo flows (`/invite/[id]`, `/join/[id]`, `/event/[id]`), **`/addnetwork`**, **`/test-calendar`** — see `app/*/page.tsx`.

### Key App Router pages (non-exhaustive)

| Path | Role |
| --- | --- |
| `/` | Main chat + sidebar + optional calendar / heatmap |
| `/events/[id]` | Event detail & share (styled with events layout) |
| `/network` | Connections UI |
| `/calendar` | Calendar-focused screen |
| `/availability` | User availability grid |
| `/test-chat` | Chat against `/api/test-chat` |
| `/test-calendar` | Calendar testing |
| `/settings` | Settings |
| `/auth`, `/login` | Authentication entry points |

## Backend (high level)

- **`GET /api/health`:** Liveness.
- **`POST /api/chat`:** Streaming agent with tools (`getSchedule`, `findOverlap`, `suggestTimes`, `createEvent`, …); uses session or body user id, optional `calendarContext` and `userTimezone` from the client.
- **`POST /api/calendars/sync`:** Persists a snapshot of Google events to **`calendars/{uid}`** (session required).
- **`/api/calendar/google/*`:** OAuth connect, list events, busy, etc.
- **CRUD:** `/api/users`, `/api/user`, `/api/network`, `/api/events`, `/api/friends`, … — see [api.md](./api.md).
- **`npm run db:seed`:** Seeds demo users/network/events via the same Firebase credentials as the API.

## Out of scope / notes

- Server-side **chat message** history is not stored in Firestore by default (client localStorage only unless you add it).
- Production hardening: tighten rate limits, review verbose logging on calendar routes, and deploy Firestore security rules if clients ever write directly to Firestore.
