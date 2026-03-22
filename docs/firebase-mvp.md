# Firebase MVP (Firestore)

Index: [docs/README.md](./README.md). HTTP mapping: [api.md](./api.md).

Service account setup is separate from this doc. Here: **collections and fields** only.

## Seed dummy data

```bash
npm run db:seed
```

**Credentials:** Same rules as the Next.js API — see [setup.md](./setup.md) and `lib/firebase-credential.ts`. Typically `FIREBASE_SERVICE_ACCOUNT_FILE=./firebase-service-account.json` or Application Default Credentials.

The seed loads `.env` via `scripts/load-env.ts`, then uses `getDb()` from `lib/firebase-admin.ts` (identical to route handlers).

Creates `users`, `network`, `events/event_demo_pickleball`, participants, and availability (see `scripts/seed-firestore.ts`). Re-running overwrites those document IDs.

## Collections

```
users
users/{userId}/calendarAccounts   # Google OAuth tokens (encrypted), etc.
network
events
events/{eventId}/participants
events/{eventId}/availability
calendars                         # Optional snapshots from home sync (see below)
```

**Not in MVP:** `events/{eventId}/messages` (chat persistence is client localStorage unless you add this).

---

## `calendars/{userId}`

Written by **`POST /api/calendars/sync`** after the client loads Google Calendar events on the home page. Document id equals the signed-in user’s Firebase **uid**.

| Field | Type | Notes |
| --- | --- | --- |
| `userId` | string | Same as document id |
| `displayName` | string or null | From profile when provided |
| `provider` | string | e.g. `google` |
| `events` | array | Sanitized event objects (summary, start/end, …) |
| `totalEvents` | number | |
| `timeMin`, `timeMax` | string or null | ISO range used for the fetch |
| `timezone` | string | IANA zone used when syncing |
| `updatedAt`, `lastSyncedAt` | timestamp | Server timestamps |

---

## `users/{userId}`

| Field | Type | Notes |
| --- | --- | --- |
| `name` | string | Display name |
| `email` | string | |
| `photoUrl` | string | Empty string if none |
| `timezone` | string | IANA, e.g. `America/Los_Angeles` |
| `calendarConnected` | boolean | |
| `ghostMode` | boolean | |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

---

## `network/{connectionId}`

| Field | Type | Notes |
| --- | --- | --- |
| `ownerUserId` | string | Who owns this connection row |
| `memberUserId` | string | Other user |
| `memberName` | string | Denormalized |
| `memberEmail` | string | |
| `memberPhotoUrl` | string | |
| `relationStatus` | string | e.g. `accepted` |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

---

## `events/{eventId}`

| Field | Type | Notes |
| --- | --- | --- |
| `title` | string | |
| `createdBy` | string | `userId` |
| `participantIds` | array of string | User ids |
| `dateRangeStart` | string | Date-only ISO, e.g. `2026-03-21` |
| `dateRangeEnd` | string | |
| `durationMinutes` | number | |
| `timezone` | string | IANA |
| `status` | string | e.g. `active` |
| `bestSlot` | object or null | See below |
| `finalizedSlot` | object or null | Same shape as `bestSlot` when set |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

**`bestSlot` / `finalizedSlot`**

| Field | Type |
| --- | --- |
| `start` | string (ISO datetime with offset) |
| `end` | string |
| `availableCount` | number |
| `score` | number (0–1) |

---

## `events/{eventId}/participants/{userId}`

| Field | Type | Notes |
| --- | --- | --- |
| `userId` | string | Same as document id |
| `name` | string | |
| `email` | string | |
| `photoUrl` | string | |
| `role` | string | e.g. `member` |
| `ghostMode` | boolean | |
| `calendarConnected` | boolean | |
| `joinedAt` | timestamp | |
| `updatedAt` | timestamp | |

---

## `events/{eventId}/availability/{userId}`

| Field | Type | Notes |
| --- | --- | --- |
| `userId` | string | Same as document id |
| `source` | string | e.g. `google_calendar` |
| `busyBlocks` | array of `{ start, end }` | ISO datetimes |
| `freeWindows` | array of `{ start, end, quality }` | `quality` e.g. `high` |
| `lastSyncedAt` | timestamp | |
| `updatedAt` | timestamp | |

---

## MVP rule

Store only what you need to: show user, show network, create event, attach participants, compute best time.
