# UI components

Paths under `components/` (PascalCase files).

## `components/ui/`

Shared primitives: **`Button`**, **`TimeChip`**, **`Avatar`**, **`Card`**-style patterns, etc. Styled with CSS variables from `app/globals.css`.

## `components/chat/`

| File | Role |
| --- | --- |
| `ChatInput.tsx` | Composer; Enter sends, Shift+Enter newline |
| `ChatMessage.tsx` | User/assistant bubble layout (assistant uses “W” avatar) |
| `ChatContent.tsx` | Scrollable transcript + suggestion cards + **time chips** from `suggestTimes` tool |
| `SchedulingParticipantsBar.tsx` | Shows who is in scope for scheduling (chips + remove) |
| `ActionBubble.tsx` | CTA bubble (e.g. create invite) |
| `AvailabilityHeatmap.tsx` | Optional panel: grid of suggested slots from **`suggestTimes`** (`lib/chat-tool-outputs.ts`) |
| `ChatWindow.tsx` | Legacy/alternate chat shell (if used by a page) |

Home (`app/page.tsx`) may **inline** a chat block instead of importing `ChatContent` only—both patterns read tool outputs the same way.

## `components/calendar/`

| File | Role |
| --- | --- |
| `MyCalendarEvents.tsx` | Side panel: month/week/day/list views of Google events |
| `CalendarView.tsx`, `CalendarEventsList.tsx`, `AvailabilityGrid.tsx`, … | Calendar demos and lists |

## `components/network/`

| File | Role |
| --- | --- |
| `NetworkPickerModal.tsx` | Modal listing connections (**view-only**; opened from `/network` in chat) |

## `components/sidebar/`

| File | Role |
| --- | --- |
| `Sidebar.tsx` | Navigation / branding |

## `components/events/`

| File | Role |
| --- | --- |
| `AddFriendsModal.tsx` | Invite / add people flows |

## Page wiring

`app/page.tsx` composes sidebar, chat, optional My Calendar column, optional heatmap, and `NetworkPickerModal`.

`app/layout.tsx` sets metadata, loads **Inter** via `next/font`, wraps **`AuthProvider`**, and applies global styles from `app/globals.css`.
