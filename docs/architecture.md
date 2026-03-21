# Architecture

## Request flow

1. Browser loads App Router pages from `app/`.
2. The home page is a client component: sidebar, `ChatWindow`, `ChatInput`. Data shown there is still mostly **mock** (`lib/mock-data.ts`); wiring to `/api/*` is the next step.
3. Route handlers in `app/api/**/route.ts` call **`getDb()`** from `lib/firebase-admin.ts` to read/write Firestore.

## Firebase Admin

### `lib/firebase-credential.ts`

Single place for **how** the server authenticates to Firebase:

1. File path from `GOOGLE_APPLICATION_CREDENTIALS`, `FIREBASE_SERVICE_ACCOUNT_FILE`, or `FIREBASE_SERVICE_ACCOUNT_PATH` (if the file exists)
2. Else `FIREBASE_SERVICE_ACCOUNT` as single-line JSON, path string, or base64 JSON
3. Else **Application Default Credentials** (`gcloud auth application-default login`)

Next.js loads `.env` / `.env.local` for API routes. The seed script uses `scripts/load-env.ts` first so the same vars apply before `getDb()` runs.

### `lib/firebase-admin.ts`

- **`getDb()`** — Firestore (initializes the default app with `getAdminCredential()`)
- **`getAuth()`** — Admin Auth (future: verify ID tokens)
- **`getServerTimestamp()`** — `FieldValue.serverTimestamp()` for writes

### `scripts/seed-firestore.ts` & `scripts/load-env.ts`

- `load-env` applies dotenv before importing `getDb`, so credentials match the API.
- Seed writes the MVP dummy documents (same IDs on each run).

## `lib/types.ts`

- **Firestore-aligned:** `UserDoc`, `NetworkConnectionDoc`, `EventDoc`, `EventParticipantDoc`, `EventAvailabilityDoc`, plus helpers (`SlotCandidate`, `TimeRange`, …).
- **UI-only:** `SchedulingEvent`, `ChatSuggestion`, `EventItem`, `MessageRole`.

## `lib/mock-data.ts`

Static copy for the chat UI and sidebar until the UI reads from the API.

## `lib/api-helpers.ts`

Shared helpers for some route handlers: `collection()` (Firestore collection ref), `timestamps()` / `updateTimestamp()`, `errorResponse` / `successResponse`, `getDocOrError`, `extractFields`. Other handlers call `getDb()` from `firebase-admin.ts` directly — both patterns coexist.

## Firestore query notes

- **`GET /api/events`** can combine `userId`, `createdBy`, and `status` with `orderBy("createdAt")`. That may require a **composite index** (Firebase shows a link in the error).
- **`GET /api/network`** requires `userId` (connections where that user is `ownerUserId`).

## Build note

If you see a Turbopack warning about `lib/firebase-credential.ts` and “unexpected file in NFT list”, it comes from `existsSync` / `process.cwd()` when resolving credential paths. `next.config.ts` sets `serverExternalPackages: ["firebase-admin"]` to keep the Admin SDK out of the bundle; the warning is often benign for this setup.

## Security (future)

- Route handlers are **unauthenticated**. Add Firebase ID token (or session) checks before production use.
- Tighten [Firestore security rules](https://firebase.google.com/docs/firestore/security/get-started) if clients ever talk to Firestore directly.
