# Architecture

## Request flow

1. Browser loads App Router pages from `app/`.
2. **Home** is a client component: sidebar, chat (`useChat`), calendar fetch for agent context, optional My Calendar and heatmap panels. Scheduling participants and chat messages may be persisted in **localStorage** (`lib/scheduling-storage.ts`, `lib/chat-storage.ts`).
3. **`/events/*` routes** use **`app/events/layout.tsx`** to wrap pages in **`bg-[var(--bg-secondary)]`** so event detail matches panel-style surfaces from the style guide (not a full-viewport strip of `--bg-primary` alone).
4. Chat requests use **`DefaultChatTransport`** to `POST /api/chat` with **credentials** so the **session cookie** is sent. The body can include `calendarContext` (preformatted markdown from the client), `schedulingParticipants`, `currentUserId`, and **`userTimezone`** (IANA zone for correct “today” in the system prompt).
5. Route handlers in `app/api/**/route.ts` use **`getDb()`** from `lib/firebase-admin.ts` and often **`getSessionUserId()`** from `lib/auth-session.ts` for authenticated operations.

## Firebase Admin

### `lib/firebase-credential.ts`

Single place for **how** the server authenticates to Firebase:

1. File path from `GOOGLE_APPLICATION_CREDENTIALS`, `FIREBASE_SERVICE_ACCOUNT_FILE`, or `FIREBASE_SERVICE_ACCOUNT_PATH` (if the file exists)
2. Else `FIREBASE_SERVICE_ACCOUNT` as single-line JSON, path string, or base64 JSON
3. Else **Application Default Credentials** (`gcloud auth application-default login`)

Next.js loads `.env` / `.env.local` for API routes. The seed script uses `scripts/load-env.ts` first so the same vars apply before `getDb()` runs.

### `lib/firebase-admin.ts`

- **`getDb()`** — Firestore (initializes the default app with `getAdminCredential()`)
- **`getAuth()`** — Admin Auth (session cookies, token verification)
- **`getServerTimestamp()`** — `FieldValue.serverTimestamp()` for writes

### `lib/auth-session.ts`

- **`getSessionUserId()`** — Verifies `firebase_session` cookie and returns Firebase **uid** (or `null`).

### `scripts/seed-firestore.ts` & `scripts/load-env.ts`

- `load-env` applies dotenv before importing `getDb`, so credentials match the API.
- Seed writes MVP dummy documents (same IDs on each run where applicable).

## Key libraries (scheduling + chat)

| Module | Role |
| --- | --- |
| `lib/calendar-utils.ts` | Busy blocks, free windows, overlap finding |
| `lib/format-calendar-for-prompt.ts` | Markdown blocks for the LLM from Google or mock data |
| `lib/mock-calendar-agent.ts` | Demo user ids and mock event filtering |
| `lib/date-in-timezone.ts` | Local calendar date / clock for agent prompts (avoid UTC-only “today”) |
| `lib/agent-plain-text-prompt.ts` | Shared “no Markdown” rules for assistant replies |
| `lib/chat-tool-outputs.ts` | Extract **`suggestTimes`** / **`createEvent`** outputs from **UIMessage `parts`** (AI SDK v5) |
| `lib/utils.ts` | `mergeUiMessageTextParts` to avoid duplicate paragraphs from multi-step tool runs |

## `lib/types.ts`

Firestore-aligned types (`UserDoc`, connections, events, …) plus UI helpers.

## `lib/data.ts`

Mock connections and demo calendar events for development and agent tools when not using live data.

## `lib/api-helpers.ts`

Shared helpers: `collection()`, `timestamps()` / `updateTimestamp()`, `errorResponse` / `successResponse`, `getDocOrError`, `extractFields`.

## Firestore query notes

- **`GET /api/events`** can combine `userId`, `createdBy`, and `status` with `orderBy("createdAt")`. That may require a **composite index** (Firebase shows a link in the error).
- **`GET /api/network`** requires `userId` (connections where that user is `ownerUserId`).

## Build note

If you see a Turbopack warning about `lib/firebase-credential.ts` and “unexpected file in NFT list”, it comes from `existsSync` / `process.cwd()` when resolving credential paths. `next.config.ts` sets `serverExternalPackages: ["firebase-admin"]` to keep the Admin SDK out of the bundle; the warning is often benign for this setup.

## Security (ongoing)

- Sensitive routes (`/api/chat`, `/api/calendars/sync`, …) should rely on **session** or explicit server-side checks; do not trust `currentUserId` from the client alone when a session exists.
- Tighten [Firestore security rules](https://firebase.google.com/docs/firestore/security/get-started) if clients ever talk to Firestore directly.
