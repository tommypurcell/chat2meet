# HTTP API

Base URL in development: `http://localhost:3000`. All JSON bodies use `Content-Type: application/json`.

**Auth:** Core CRUD samples below assume internal/dev use. In production, prefer **session cookies** (`firebase_session`) for routes that read the current user. See **Auth & chat** and **Calendar** subsections.

**Errors:** Most failures return `{ "error": string }` with 4xx/5xx. Success bodies vary by route below.

### Route index (core CRUD)

| Path | Methods |
| --- | --- |
| `/api/health` | GET |
| `/api/users` | GET, POST |
| `/api/users/[userId]` | GET, PATCH, DELETE |
| `/api/network` | GET, POST |
| `/api/network/[connectionId]` | GET, PATCH, DELETE |
| `/api/events` | GET, POST |
| `/api/events/[eventId]` | GET, PATCH, DELETE |
| `/api/events/[eventId]/claim-guest` | POST |
| `/api/events/[eventId]/participants` | GET, POST |
| `/api/events/[eventId]/participants/[userId]` | GET, PATCH, DELETE |
| `/api/events/[eventId]/availability` | GET, POST |
| `/api/events/[eventId]/availability/[userId]` | GET, PATCH, DELETE |
| `/api/events/[eventId]/group-availability` | POST | Aggregate participant availability for an event (body: `participantIds`, …) |

### Route index (auth, chat, calendar)

| Path | Methods | Notes |
| --- | --- | --- |
| `/api/auth/session` | POST | Exchange Firebase ID token for session cookie |
| `/api/auth/me` | GET | Current user profile (session) |
| `/api/auth/signout` | POST | Clear Firebase session cookie (`cookies.delete`) |
| `/api/auth/logout` | POST | Clear session cookie (`maxAge: 0`); same goal as signout, different implementation |
| `/api/auth/google`, `/api/auth/google/callback` | GET | Google OAuth for Calendar |
| `/api/chat` | POST | Streaming UI message response; tools + Google/mock calendar |
| `/api/test-chat` | POST | Same shape as chat; mock-heavy demo |
| `/api/onboarding/chat` | POST | Onboarding assistant |
| `/api/user`, `/api/user/[userId]`, `/api/user/availability` | GET, PATCH, … | Profile and preferences |
| `/api/friends` | GET, POST | Friends / connections |
| `/api/calendar/google/events` | GET | List events (OAuth, `userId` query) |
| `/api/calendar/google/connect`, `disconnect`, `busy`, `calendars`, `heatmap`, `auth-url` | GET, POST, … | Google Calendar integration (per-user OAuth) |
| `/api/calendar/heatmap` | POST | **Multi-user** slot grid for UI heatmap (`userIds`, date range, `timezone`, …) — see `lib/heatmap-types` |
| `/api/calendar/availability` | POST | Multi-user availability slots (server-side math) |
| `/api/calendars/sync` | POST | Save last-fetched Google events snapshot to **`calendars/{uid}`** (session) |

Full request/response details for Google OAuth and calendar live in [google-calendar-setup.md](./google-calendar-setup.md) and [calendar-agent-integration.md](./calendar-agent-integration.md).

---

## Health

### `GET /api/health`

No Firestore. Response:

```json
{ "ok": true, "service": "when2meet-agent" }
```

---

## Users — `users` collection

### `POST /api/users`

Creates a user; Firestore assigns document id.

| Body field | Required | Default |
| --- | --- | --- |
| `name`, `email` | yes | — |
| `photoUrl` | no | `""` |
| `timezone` | no | `"America/Los_Angeles"` |
| `calendarConnected` | no | `false` |
| `ghostMode` | no | `false` |

**201:** `{ id, ...fields }`

### `GET /api/users`

| Query | Default | Max |
| --- | --- | --- |
| `limit` | 50 | 100 |
| `offset` | 0 | — |

Ordered by `createdAt` desc.

**200:** `{ users: [...], count, limit, offset }`

### `GET /api/users/[userId]`

**200:** `{ id, ... }`  
**404:** user missing

### `PATCH /api/users/[userId]`

Updatable: `name`, `email`, `photoUrl`, `timezone`, `calendarConnected`, `ghostMode`. At least one required.

**200:** updated document  
**400:** no valid fields  
**404:** not found

### `DELETE /api/users/[userId]`

**200:** `{ success: true, message }`  
**404:** not found

---

## Network — `network` collection

### `POST /api/network`

| Body field | Required |
| --- | --- |
| `ownerUserId`, `memberUserId`, `memberName`, `memberEmail` | yes |
| `memberPhotoUrl` | no (`""`) |
| `relationStatus` | no (`"pending"`) |

**201:** `{ id, ... }`

### `GET /api/network`

| Query | Required |
| --- | --- |
| `userId` | **yes** — connections where `ownerUserId == userId` |
| `status` | no — filter `relationStatus` |
| `limit` | no (default 50, max 100) |

Ordered by `createdAt` desc.

**200:** `{ connections: [...], count, limit }`  
**400:** missing `userId`

### `GET /api/network/[connectionId]`

**200** | **404**

### `PATCH /api/network/[connectionId]`

Updatable: `memberName`, `memberEmail`, `memberPhotoUrl`, `relationStatus`.

**200** | **400** | **404**

### `DELETE /api/network/[connectionId]`

**200** | **404**

---

## Events — `events` collection

### `POST /api/events`

| Body field | Required | Default |
| --- | --- | --- |
| `title`, `createdBy`, `dateRangeStart`, `dateRangeEnd`, `durationMinutes` | yes | — |
| `participantIds` | no | `[createdBy]` |
| `timezone` | no | `"America/Los_Angeles"` |
| `status` | no | `"draft"` |
| `bestSlot`, `finalizedSlot` | no | `null` |

**201:** `{ id, ... }`

### `GET /api/events`

| Query | Behavior |
| --- | --- |
| `userId` | `participantIds` array-contains |
| `createdBy` | `createdBy ==` |
| `status` | `status ==` |
| `limit` | default 50, max 100 |

Ordered by `createdAt` desc.

**Note:** Combining multiple `where` clauses with `orderBy` may require a **Firestore composite index** (create from the error link in logs).

**200:** `{ events: [...], count, limit }`

### `GET /api/events/[eventId]`

**200** | **404**

### `PATCH /api/events/[eventId]`

Updatable: `title`, `participantIds`, `dateRangeStart`, `dateRangeEnd`, `durationMinutes`, `timezone`, `status`, `bestSlot`, `finalizedSlot`.

**200** | **400** | **404**

### `DELETE /api/events/[eventId]`

**200** | **404**

### `POST /api/events/[eventId]/claim-guest`

Session-authenticated route used after a guest creates a poll and then signs up or signs in.

| Body field | Required | Notes |
| --- | --- | --- |
| `guestId` | yes | Guest identity previously stored on the event, e.g. `guest_tim` |

Behavior:

- Verifies the signed-in user from the session cookie
- Verifies the given `guestId` is the event creator or a participant on that event
- Migrates `participants/{guestId}` and `availability/{guestId}` to the signed-in uid
- Updates parent event `createdBy`, `creatorName`, and `participantIds`

**200:** `{ success: true, eventId, userId, claimedFromGuestId }`  
**400:** guest id missing / not attached to the event  
**401:** no session  
**404:** event missing

---

## Event participants — `events/{eventId}/participants`

Document id equals `userId`.

### `POST /api/events/[eventId]/participants`

| Body field | Required | Default |
| --- | --- | --- |
| `userId`, `name`, `email` | yes | — |
| `photoUrl` | no | `""` |
| `role` | no | `"member"` |
| `ghostMode`, `calendarConnected` | no | `false` |

Also appends `userId` to parent event’s `participantIds`.

**201:** `{ id, ... }`  
**404:** event missing  
**409:** participant already exists

### `GET /api/events/[eventId]/participants`

| Query | Behavior |
| --- | --- |
| `role` | optional filter (`organizer` \| `member`) |

**200:** `{ participants, count }`  
**404:** event missing

### `GET /api/events/[eventId]/participants/[userId]`

**200** | **404**

### `PATCH /api/events/[eventId]/participants/[userId]`

Updatable: `name`, `email`, `photoUrl`, `role`, `ghostMode`, `calendarConnected`.

**200** | **400** | **404**

### `DELETE /api/events/[eventId]/participants/[userId]`

Removes doc and `userId` from parent `participantIds`.

**200** | **404**

---

## Event availability — `events/{eventId}/availability`

Document id equals `userId`.

### `POST /api/events/[eventId]/availability`

Creates or overwrites (merge) availability for `body.userId`.

| Body field | Required | Default |
| --- | --- | --- |
| `userId` | yes | — |
| `source` | no | `"unknown"` |
| `busyBlocks`, `freeWindows` | no | `[]` |
| `lastSyncedAt` | no | server time |

**201:** `{ id, ... }`  
**404:** event missing

### `GET /api/events/[eventId]/availability`

| Query | Behavior |
| --- | --- |
| `source` | optional filter |

**200:** `{ availability, count }`  
**404:** event missing

### `GET /api/events/[eventId]/availability/[userId]`

**200** | **404**

### `PATCH /api/events/[eventId]/availability/[userId]`

Updatable: `source`, `busyBlocks`, `freeWindows`, `lastSyncedAt`.

**200** | **400** | **404**

### `DELETE /api/events/[eventId]/availability/[userId]`

**200** | **404**

---

## Event group availability — aggregate

### `POST /api/events/[eventId]/group-availability`

Aggregates per-participant availability under the event for scoring / display. Expects JSON including **`participantIds`** (array). Returns slot summaries (e.g. scores, who is free). Used when building group views from stored `events/{eventId}/availability` data.

---

## Quick test (curl)

```bash
curl -s http://localhost:3000/api/health
curl -s "http://localhost:3000/api/users?limit=5"
```

Schema details: [firebase-mvp.md](./firebase-mvp.md).
