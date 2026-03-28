# Building On This Version

Use this guide if you are new to the repo and need to extend the current guest-poll / chat / calendar version without breaking important behavior.

This is not a full architecture doc. It is the practical "what should I know before I touch anything?" guide.

## Start here

Read these first, in order:

1. [overview.md](./overview.md)
2. [calendar-agent-integration.md](./calendar-agent-integration.md)
3. [api.md](./api.md)
4. [components.md](./components.md)
5. [features.md](./features.md)

If your work touches guest poll flow or recent chat behavior, also read:

6. [recent-changes.md](./recent-changes.md)

## Before you change code

- Run the app and exercise the main flows yourself.
- Check whether the change affects logged-in chat, guest poll creation, event pages, or auth handoff.
- If you touch `app/page.tsx`, expect both UI and flow logic to live there.
- If you touch `app/api/chat/route.ts`, treat prompt wording as product logic, not just copy.

## Core flows you should understand

### 1. Logged-in scheduling

- Home chat uses `useChat` + `DefaultChatTransport` in [app/page.tsx](/Users/tommy/Documents/when2meet-agent/app/page.tsx).
- Requests go to `POST /api/chat`.
- The client sends `messages`, `schedulingParticipants`, `currentUserId`, `calendarContext`, and `userTimezone`.
- The server prompt uses that timezone/date context to interpret words like `today` and `tomorrow`.
- Tool results are rendered from AI SDK v5 `parts`, not just legacy `toolResults`.

### 2. Guest poll creation

- Guest prompts start from [lib/guest-chat-starters.ts](/Users/tommy/Documents/when2meet-agent/lib/guest-chat-starters.ts).
- The guest flow is controlled mostly by the system prompt in [app/api/chat/route.ts](/Users/tommy/Documents/when2meet-agent/app/api/chat/route.ts).
- After `createGuestEvent`, the assistant must call `showEventPoll`.
- The success text should stay short and separate from the account CTA.
- The poll card / heatmap is the primary result, not a pasted raw URL.

### 3. Guest to account handoff

- Guest poll identity is stored locally in [lib/guest-session.ts](/Users/tommy/Documents/when2meet-agent/lib/guest-session.ts), keyed by `eventId`.
- After guest auth, home calls `POST /api/events/[eventId]/claim-guest`.
- That route migrates participant + availability docs from `guestId` to the signed-in uid.
- If you change guest ids, event ownership, participant docs, or availability docs, review this flow carefully.

### 4. Event detail pages

- `/events/[id]` is the current public event page.
- It depends on:
  - event document fields like `createdBy`, `creatorName`, `participantIds`, `shareUrl`, `timezone`
  - `participants` subcollection
  - `availability` subcollection
- The in-chat poll card and the event page both assume these shapes remain stable.

## Files that carry a lot of product logic

These files are high-risk:

- [app/page.tsx](/Users/tommy/Documents/when2meet-agent/app/page.tsx)
- [app/api/chat/route.ts](/Users/tommy/Documents/when2meet-agent/app/api/chat/route.ts)
- [lib/chat-tool-outputs.ts](/Users/tommy/Documents/when2meet-agent/lib/chat-tool-outputs.ts)
- [components/chat/EventPollCard.tsx](/Users/tommy/Documents/when2meet-agent/components/chat/EventPollCard.tsx)
- [components/events/EventAvailabilityGrid.tsx](/Users/tommy/Documents/when2meet-agent/components/events/EventAvailabilityGrid.tsx)
- [components/events/EventGroupHeatmap.tsx](/Users/tommy/Documents/when2meet-agent/components/events/EventGroupHeatmap.tsx)
- [lib/guest-session.ts](/Users/tommy/Documents/when2meet-agent/lib/guest-session.ts)
- [app/api/events/[eventId]/claim-guest/route.ts](/Users/tommy/Documents/when2meet-agent/app/api/events/[eventId]/claim-guest/route.ts)

If you edit one of these, test the related flow manually before you stop.

## Things that are easy to break

### Prompt behavior

- "One question at a time" in guest mode.
- Relative date confirmation must be a standalone message.
- If the date window is already clear, the next guest question should be availability, not dates again.
- After successful guest poll creation, the assistant should not paste the raw URL in text if the poll card is already visible.

### Tool output rendering

- The UI reads assistant tool results from `parts`.
- If you change tool names or output shapes, update [lib/chat-tool-outputs.ts](/Users/tommy/Documents/when2meet-agent/lib/chat-tool-outputs.ts) and the UI that reads it.
- `showEventPoll` output must stay compatible with `EventPollCard`.

### Event ownership and participant migration

- `claim-guest` assumes:
  - guest id is in `createdBy` or `participantIds`
  - participant doc id equals the user id
  - availability doc id equals the user id
- If you change those assumptions, guest upgrade will break unless you update the migration route too.

### Chat layout and scrolling

- The home layout relies on `min-h-0` and explicit scroll containers.
- Auto-scroll currently responds to new messages and important guest CTA state changes.
- If you refactor the transcript layout, test:
  - new assistant message while streaming
  - poll card render
  - email signup form expansion
  - mobile and desktop

### Auth flow

- Google auth and email signup both create a Firebase session through `POST /api/auth/session`.
- New accounts may route to onboarding.
- If you change login/session behavior, verify guest poll claiming still works afterward.

## What to preserve unless you intentionally redesign it

- Guest poll result should feel complete before upsell.
- Account CTA should be separate from the poll success message.
- Poll card should render in chat as the main artifact.
- `Continue with Google` and `Sign up with email` should be available under the poll for guests.
- Logged-out home header should stay simplified compared with logged-in header.

## Manual regression checklist

Run these before you consider a chat / guest / poll change done:

1. Guest creates a poll from scratch.
2. Relative-date confirmation happens in its own message.
3. Guest is asked availability at the right time.
4. Poll card appears in chat after creation.
5. Success text is short and does not dump the raw URL.
6. Guest CTA appears below the poll card.
7. Clicking `Continue with Google` works or cleanly cancels without noisy error text.
8. Clicking `Sign up with email` opens the inline form and the chat scrolls to reveal it.
9. After auth, the guest poll is attached to the account.
10. `/events/[id]` still loads and the grids still render.

Also test at least one logged-in scheduling flow so you do not accidentally break normal chat while working on guest mode.

## When you add something new

Update docs in the same change:

- [api.md](./api.md) for new routes or changed request/response shapes
- [components.md](./components.md) for new UI pieces or ownership changes
- [features.md](./features.md) for user-visible behavior
- [styleguide.md](./styleguide.md) if visual patterns or tokens changed
- [recent-changes.md](./recent-changes.md) if the change materially affects guest poll/chat behavior

## Good implementation habits in this repo

- Prefer reusing existing tool/result shapes instead of inventing parallel ones.
- Keep guest flow changes in sync across:
  - prompt instructions
  - tool outputs
  - chat rendering
  - auth handoff
- When possible, make the UI derive from one source of truth instead of duplicating state in multiple components.
- If a fix seems "just copy," check whether it is actually prompt logic.

## If you are unsure where to start

- Chat bug: start in [app/page.tsx](/Users/tommy/Documents/when2meet-agent/app/page.tsx)
- Agent behavior bug: start in [app/api/chat/route.ts](/Users/tommy/Documents/when2meet-agent/app/api/chat/route.ts)
- Poll card / heatmap bug: start in [components/chat/EventPollCard.tsx](/Users/tommy/Documents/when2meet-agent/components/chat/EventPollCard.tsx)
- Guest auth / claim bug: start in [app/page.tsx](/Users/tommy/Documents/when2meet-agent/app/page.tsx), [lib/guest-session.ts](/Users/tommy/Documents/when2meet-agent/lib/guest-session.ts), and [app/api/events/[eventId]/claim-guest/route.ts](/Users/tommy/Documents/when2meet-agent/app/api/events/[eventId]/claim-guest/route.ts)

## Bottom line

This version works because chat prompt rules, tool output shapes, event data shape, and guest auth handoff all line up.

If you change one of those layers, check the others before you merge.
