# UI components

Paths under `components/` (PascalCase files).

## `components/ui/`

| File | Role |
| --- | --- |
| `Button.tsx` | Variants: `primary`, `secondary`, `ghost`, `danger`; sizes `sm`–`lg`, `icon` |
| `Card.tsx` | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` |
| `Avatar.tsx` | Initials on gradient (`--accent-primary` → `--avatar-gradient-end`) |
| `UserAvatar.tsx` | Photo URL or fallback to `Avatar` |
| `TimeChip.tsx` | Suggested slot chips (selected vs action style) |
| `CalendarCell.tsx` | Day cell for calendar UIs |
| `SheetHandle.tsx` | Bottom-sheet drag handle |
| `DevNav.tsx` | Dev-only screen / theme navigator (fixed FAB) |

Styled with CSS variables from `app/globals.css`; see [styleguide.md](./styleguide.md).

## `components/chat/`

| File | Role |
| --- | --- |
| `ChatInput.tsx` | Composer; Enter sends, Shift+Enter newline |
| `ChatMessage.tsx` | User/assistant bubble layout (assistant uses “W” avatar); `block w-fit` bubble + inner `break-words` |
| `ChatMessageText.tsx` | Plain text with URL detection → links (`--text-link`, `target="_blank"`) |
| `ChatBubble.tsx` | Bubble only (no avatar row); optional tail corners |
| `ChatContent.tsx` | Scrollable transcript + suggestion cards + **time chips** from tool output |
| `SchedulingParticipantsBar.tsx` | Who is in scope for scheduling (chips + remove) |
| `ActionBubble.tsx` | CTA bubble (e.g. create invite) |
| `AvailabilityHeatmap.tsx` | Group availability grid (fetches `POST /api/calendar/heatmap`) |
| `ChatWindow.tsx` | Legacy sample chat shell |

Home (`app/page.tsx`) **inlines** a large chat block (not only `components/chat/ChatContent.tsx`); logic mirrors `ChatContent` (empty state, messages, typing row, chips, invite preview).

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
| `EventCard.tsx` | Scheduling event summary + “Add friends” → `AddFriendsModal` |
| `AddFriendsModal.tsx` | Search / add participants modal |

## `components/layout/`

| File | Role |
| --- | --- |
| `UserMenu.tsx` | Header or sidebar user menu (avatar, links, sign out) |

## Page wiring

`app/page.tsx` composes sidebar, chat, optional My Calendar column, optional heatmap, and `NetworkPickerModal`.

**Event detail:** `app/events/[id]/page.tsx` uses `Card`, `Button`, and tokens; shell background comes from `app/events/layout.tsx`.

`app/layout.tsx` sets metadata, loads **Inter** via `next/font`, wraps **`ThemeProvider`**, **`AuthProvider`**, and applies global styles from `app/globals.css`.
