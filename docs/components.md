# UI Components

Paths under `components/` (PascalCase files).

## `components/calendar/` (The Core "Precious Works")

| File | Role |
| --- | --- |
| `AvailabilityGrid.tsx` | The "Ghost Grid": A highly interactive 7-day drag-to-select mesh mapping soft working constraints. |
| `MyCalendarEvents.tsx` | The Right Column proof: Visualizes actual Google Calendar events using a similar 7-day grid rendering. |
| `GoogleCalendarConnect.tsx` | OAuth initiation button to connect to Google APIs. |
| `GoogleCalendarDisconnect.tsx` | Handles token revocation and cleanup. |

## `components/chat/` (The Intelligence)

| File | Role |
| --- | --- |
| `ChatContent.tsx` | The conversational UI wrapper natively bound to the Vercel AI SDK (`useChat`). |
| `ChatWindow.tsx` | Scroll area holding welcome text, agent streams, and final proposals. |

## `components/ui/` (Glassmorphism Primitives)

Shared primitives: **`Button`** (variants: default, outline, ghost, accent; sizes including `icon`), **`Card`** plus `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`. Styled with Glassmorphism CSS variables from `app/globals.css` (`--chat-*`), heavy reliance on `backdrop-blur` and gradients.

## `components/sidebar/` & `components/events/`
- Sidebars handle network grouping and active event tickets.
- `EventCard.tsx` manages confirmed bookings.

## Page Wiring (`app/`)
- `app/page.tsx`: Handles the 3-column "Cockpit" layout.
- `app/settings/page.tsx`: Houses the **Calendar Selection Logic** (where users can pick exactly which Google Calendar governs their availability).
- `app/layout.tsx`: Injects `Inter` font, Global CSS, and NextAuth/Firebase context.
