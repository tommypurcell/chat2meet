# UI components

Paths under `components/` (PascalCase files).

## `components/ui/`

Shared primitives: **`Button`** (variants: default, outline, ghost, accent; sizes including `icon`), **`Card`** plus `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`. Styled with CSS variables from `app/globals.css` (`--chat-*`).

## `components/chat/`

| File | Role |
| --- | --- |
| `ChatWindow.tsx` | Main scroll area: welcome copy, suggestion cards, “Active events” grid |
| `ChatInput.tsx` | Composer; Enter sends, Shift+Enter newline |
| `ChatMessage.tsx` | Layout helper for future user/assistant bubbles |

## `components/sidebar/`

| File | Role |
| --- | --- |
| `Sidebar.tsx` | Left rail: branding, drawer on small screens, overlay |
| `NewEventButton.tsx` | Primary CTA (outline `Button`) |
| `EventList.tsx` | Renders `EventItem[]` from props (mock data today) |

## `components/events/`

| File | Role |
| --- | --- |
| `EventCard.tsx` | Scheduling-style card; opens `AddFriendsModal` |
| `AddFriendsModal.tsx` | Email paste modal (invite flow not wired to API yet) |

## Page wiring

`app/page.tsx` composes `Sidebar`, `ChatWindow`, and `ChatInput` and holds mobile sidebar open state.

`app/layout.tsx` sets metadata, loads **Inter** via `next/font`, and applies global styles from `app/globals.css`.
