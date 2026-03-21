# Overview

## Intent

**When2Meet Agent** helps groups find meeting times using conversational flows and server-side logic, modeled after When2Meet’s job (availability + best slot) but **without** the manual grid as the primary UI.

## Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Fonts:** [Inter](https://fonts.google.com/specimen/Inter) via `next/font` (`app/layout.tsx`)
- **Styling:** Tailwind CSS v4 (`app/globals.css`, CSS variables `--chat-*`)
- **Data:** Firebase **Firestore** (MVP collections: `users`, `network`, `events` + subcollections)
- **Server SDK:** `firebase-admin` with shared credential resolution in `lib/firebase-credential.ts`
- **Tooling:** ESLint (`eslint-config-next`), `tsx` for scripts, optional Firebase CLI (`firebase-tools`)

## Repository layout

```
app/                  # app/page.tsx, layout, globals.css, app/api/* route handlers
components/           # chat/, sidebar/, events/, ui/
lib/                  # types, mock-data, utils, firebase-credential, firebase-admin, api-helpers
scripts/              # load-env.ts, seed-firestore.ts
docs/                 # Project documentation
public/               # Static assets
```

## Frontend (high level)

- **Home (`app/page.tsx`):** Client layout with collapsible sidebar, `ChatWindow`, `ChatInput`.
- **Chat:** Suggestion cards, `ChatMessage` helper for future transcript rows, composer.
- **Sidebar:** Recent items from mock data; `NewEventButton`, `EventList`.
- **Events:** `EventCard`, `AddFriendsModal` (UI; API wiring optional).

## Backend (high level)

- **`GET /api/health`:** No database; process liveness.
- **`/api/users`, `/api/network`, `/api/events`, …:** CRUD aligned with [firebase-mvp.md](./firebase-mvp.md).
- **`npm run db:seed`:** Writes deterministic demo documents via the same Firebase credentials as the API.

## Out of scope (MVP)

- Chat **message** persistence under `events/{id}/messages` (not in schema).
- End-user auth in the UI (Admin `getAuth()` is ready for server-side verification later).
