# HTTP API

Base URL in development: `http://localhost:3000`. All JSON bodies use `Content-Type: application/json`.

**Auth:** None yet — treat as internal / dev-only until you add verification.

**Errors:** Most failures return `{ "error": string }` with 4xx/5xx. Success bodies vary by route below.

### Route index

| Path | Methods |
| --- | --- |
| `/api/health` | GET |
| `/api/users` | GET, POST |
| `/api/users/[userId]` | GET, PATCH, DELETE |
| `/api/network` | GET, POST |
| `/api/network/[connectionId]` | GET, PATCH, DELETE |
| `/api/events` | GET, POST |
| `/api/events/[eventId]` | GET, PATCH, DELETE |
| `/api/events/[eventId]/participants` | GET, POST |
| `/api/events/[eventId]/participants/[userId]` | GET, PATCH, DELETE |
| `/api/events/[eventId]/availability` | GET, POST |
| `/api/events/[eventId]/availability/[userId]` | GET, PATCH, DELETE |

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

## Quick test (curl)

```bash
curl -s http://localhost:3000/api/health
curl -s "http://localhost:3000/api/users?limit=5"
```

Schema details: [firebase-mvp.md](./firebase-mvp.md).
