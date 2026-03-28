# Guest Poll And Chat Notes

Current implementation notes for the guest poll flow, in-chat poll cards, and guest-to-account handoff. This file is a working map for the current app behavior, not a release changelog.

| Area | Files (main touchpoints) |
| --- | --- |
| Home / chat shell | `app/page.tsx` |
| Composer | `components/chat/ChatInput.tsx` |
| Guest copy & prompts | `lib/guest-chat-starters.ts` |
| Chat agent & tools | `app/api/chat/route.ts`, `app/api/test-chat/route.ts` |
| Poll card UI | `components/chat/EventPollCard.tsx`, `lib/chat-tool-outputs.ts` |
| Guest → account handoff | `app/api/events/[eventId]/claim-guest/route.ts`, `lib/guest-session.ts` |
| Event grids | `components/events/EventAvailabilityGrid.tsx`, `components/events/EventGroupHeatmap.tsx`, `lib/event-grid-slots.ts` |
| Event page | `app/events/[id]/page.tsx` |
| Styleguide | `docs/styleguide.md` |

---

## Home (`app/page.tsx`)

- **Guest empty state (logged out, no messages):** Icon + short intro; **Create an event** and **Connect calendar** as large bordered cards (same visual language as signed-in suggestion cards); **Quick start** as small centered pills that prefill the composer and focus it.
- **Signed-in empty state:** Unchanged pattern (suggestion grid / tablet / mobile lists).
- **Transcript:** Renders assistant tool output as **`EventPollCard`** when messages include `showEventPoll` results (via `extractEventPollCardsFromMessage`).
- **Guest poll + auth:** After `createGuestEvent`, persists **guest session** by `eventId`; renders a separate assistant-side account CTA below the poll card with **Continue with Google** and **Sign up with email**; email expands into a small inline form (`email`, `password`, `confirm password`). After auth, home calls **`POST /api/events/{eventId}/claim-guest`** with the stored `guestId`, then clears that event’s guest session entry.
- **Scroll / layout:** `min-h-0` on flex ancestors + message list so the thread **does not paint under** the scheduling bar and composer. **`useLayoutEffect`** scrolls the three layout scroll containers to the bottom when `messages`, `status`, or key UI flags change (keeps latest assistant text in view).

---

## Composer (`components/chat/ChatInput.tsx`)

- Optional **controlled** draft: `value` + `onValueChange`.
- **`focusRequestId`:** Increment from parent to focus the textarea (used by quick-start pills).
- **Bar background:** `bg-[var(--bg-secondary)]` so it aligns with **`SchedulingParticipantsBar`** (avoids a pure-black strip under the chat in dark mode when `--bg-primary` is `#000`).

---

## Guest prompts (`lib/guest-chat-starters.ts`)

- **`GUEST_CREATE_EVENT_MESSAGE`:** Fixed kickoff string for the structured guest poll flow.
- **`GUEST_QUICK_STARTS`:** Label, short subtitle (tooltip), and full prompt per pill.

---

## Chat API (`app/api/chat/route.ts`)

- **`buildEventPollSnapshot` (+ helpers):** Resolves event id from pasted URL or raw id; loads Firestore event, participants, availability; builds overlap grid metadata, missing responders, top slots, summary.
- **`getEventPoll`:** Returns that snapshot for the model (inspect / answer questions).
- **`showEventPoll`:** Same snapshot shaped for UI; front end maps it to **`EventPollCard`**.
- **System prompt:** Instructs the model to use these tools when the user shares a poll link or asks about an existing poll.
- **Guest flow rules:** Relative-date confirmation must stand alone; if the date window is already clear (`tomorrow`, `next week`, etc.), ask availability next instead of re-asking dates; after `createGuestEvent`, call **`showEventPoll`** before the final success text.

## Test chat (`app/api/test-chat/route.ts`)

- Adds an explicit **relative date / timezone** section in the demo prompt (aligned with production intent: “today” from local calendar date, not UTC).

---

## Poll card (`components/chat/EventPollCard.tsx`)

- In-chat **When2Meet-style** mini grid (shared constants from `lib/event-grid-slots.ts`), hover detail, **copy share link**, link to the event page.

## Tool output parsing (`lib/chat-tool-outputs.ts`)

- Types and extractors for **guest create** results and **`EventPollCard`** payloads from AI SDK v5 **`parts`** (`tool-*` / `dynamic-tool`), not legacy `toolResults` only.

---

## Guest handoff

- **`lib/guest-session.ts`:** Map keyed by **`eventId`** (`load` / `save` / `clear`); used on the event availability grid and after agent-created polls.
- **`POST /api/events/[eventId]/claim-guest`:** Session-authenticated; verifies guest id is **`createdBy`** or in **`participantIds`**; migrates participant + availability docs from **`guestId`** to **`sessionUserId`**; updates **`createdBy`**, **`creatorName`**, and **`participantIds`**; batch write.

---

## Event grids & density (`lib/event-grid-slots.ts`, event components)

- **Slot row height** tightened (`EVENT_GRID_SLOT_HEIGHT_PX` **15** vs 18) for When2Meet-like density; comments on day column width.
- **`EventAvailabilityGrid` / `EventGroupHeatmap`:** Layout/sticky/header alignment work so tables match card width and use semantic **`--bg-tertiary`** chrome (see [styleguide.md](./styleguide.md) § Event grids).

## Event detail page (`app/events/[id]/page.tsx`)

- Drops **`creatorId` / `creatorName`** props passed into the group heatmap (grid derives context without them).

---

## Documentation

- **`docs/styleguide.md`:** **`ChatInput`** bar documented as **`--bg-secondary`** with rationale.

---

## Follow-ups (optional)

- **Stick-to-bottom:** If users scroll up to read history, auto-scroll on every `messages` update may feel aggressive; consider scrolling only when the user is already near the bottom.
- **Type hygiene:** `app/page.tsx` local `ChatContent` still has known TS nits around `MessageRole` / `parts` typing (pre-existing or incremental).
