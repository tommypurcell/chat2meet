# UI style guide

This document describes the **When2Meet / Chat2meet** visual system as implemented today. The **source of truth** for tokens is [`app/globals.css`](../app/globals.css). Components should use **CSS variables** (`var(--…)`) for colors, borders, and shadows so **light** and **dark** themes stay consistent.

For a **documentation index** (setup, API, architecture, calendar docs), see [`docs/README.md`](./README.md).

### Component index (all `components/**/*.tsx`)

| Area | Component | File |
| --- | --- | --- |
| UI | `Button`, `Card` (+ Header, Title, Description, Content, Footer) | [`components/ui/Button.tsx`](../components/ui/Button.tsx), [`components/ui/Card.tsx`](../components/ui/Card.tsx) |
| UI | `Avatar`, `UserAvatar` | [`components/ui/Avatar.tsx`](../components/ui/Avatar.tsx), [`components/ui/UserAvatar.tsx`](../components/ui/UserAvatar.tsx) |
| UI | `TimeChip`, `CalendarCell`, `SheetHandle` | [`components/ui/TimeChip.tsx`](../components/ui/TimeChip.tsx), [`components/ui/CalendarCell.tsx`](../components/ui/CalendarCell.tsx), [`components/ui/SheetHandle.tsx`](../components/ui/SheetHandle.tsx) |
| UI | `DevNav` | [`components/ui/DevNav.tsx`](../components/ui/DevNav.tsx) |
| Chat | `ChatMessage`, `ChatMessageText`, `ChatBubble`, `ActionBubble`, `ChatInput`, `ChatWindow`, `ChatContent` | [`components/chat/`](../components/chat/) |
| Chat | `AvailabilityHeatmap`, `SchedulingParticipantsBar` | [`components/chat/AvailabilityHeatmap.tsx`](../components/chat/AvailabilityHeatmap.tsx), [`components/chat/SchedulingParticipantsBar.tsx`](../components/chat/SchedulingParticipantsBar.tsx) |
| Sidebar | `Sidebar`, `NewEventButton`, `EventList` | [`components/sidebar/`](../components/sidebar/) |
| Events | `EventCard`, `AddFriendsModal` | [`components/events/`](../components/events/) |
| Network | `NetworkPickerModal` | [`components/network/NetworkPickerModal.tsx`](../components/network/NetworkPickerModal.tsx) |
| Layout | `UserMenu` | [`components/layout/UserMenu.tsx`](../components/layout/UserMenu.tsx) |
| Calendar | `AvailabilityGrid`, `CalendarHeatmap`, `CalendarView`, `CalendarEventsList` | [`components/calendar/`](../components/calendar/) |
| Calendar | `GoogleCalendarConnect`, `GoogleCalendarDisconnect` | [`components/calendar/GoogleCalendarConnect.tsx`](../components/calendar/GoogleCalendarConnect.tsx), [`components/calendar/GoogleCalendarDisconnect.tsx`](../components/calendar/GoogleCalendarDisconnect.tsx) |
| Calendar | `UserCalendarView`, `UserCalendarHeatmap`, `MyCalendarEvents` | [`components/calendar/UserCalendarView.tsx`](../components/calendar/UserCalendarView.tsx), [`components/calendar/UserCalendarHeatmap.tsx`](../components/calendar/UserCalendarHeatmap.tsx), [`components/calendar/MyCalendarEvents.tsx`](../components/calendar/MyCalendarEvents.tsx) |

### App routes (styling notes)

| Route | Notes |
| --- | --- |
| [`app/events/layout.tsx`](../app/events/layout.tsx) | `/events/*` uses **`bg-[var(--bg-secondary)]`** for the subtree (avoids bare `--bg-primary` black for full-bleed pages). |
| [`app/events/[id]/page.tsx`](../app/events/[id]/page.tsx) | Header **`bg-tertiary`**, main **`bg-secondary`**, **`Card`** surfaces **`bg-tertiary`** via `className` override; inputs use **`--input-*`**; links/buttons follow **`Button`** tokens. |

---

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js App Router |
| Styling | **Tailwind CSS v4** (`@import "tailwindcss"` in `globals.css`) |
| Font | **Inter** via `next/font` → `--font-inter` on `<html>` (`app/layout.tsx`) |
| Body | `font-sans`, `antialiased`, `min-h-full` |
| Theming | `html[data-theme="light" \| "dark"]` — updated by `ThemeProvider` (`lib/theme.tsx`) |

**Default in code:** `layout.tsx` sets `data-theme="dark"` on `<html>`; `ThemeProvider` syncs `data-theme` when the user toggles. All semantic colors are **redefined per theme** in `globals.css`.

---

## Typography

### Family

- **Sans:** Inter (`--font-inter`), applied as Tailwind `font-sans`.

### Scale (`@theme inline` in `globals.css`)

These are available as Tailwind theme extensions (use when you need named steps):

| Token | Size | Typical use |
| --- | --- | --- |
| `--font-size-title-1` | 28px | Hero / rare |
| `--font-size-title-2` | 22px | Screen titles |
| `--font-size-title-3` | 20px | Section titles |
| `--font-size-headline` | 17px | Emphasized labels |
| `--font-size-body` | 17px | Body default |
| `--font-size-callout` | 16px | Secondary body |
| `--font-size-subhead` | 15px | Subheads, compact UI |
| `--font-size-footnote` | 13px | Meta, hints |
| `--font-size-caption-1` | 12px | Captions |
| `--font-size-caption-2` | 11px | Fine print |

### Patterns in components

| Pattern | Example |
| --- | --- |
| Chat bubble body | `text-base` (16px), `leading-[1.35]`, `tracking-[-0.32px]` (`ChatMessage`, `ChatBubble`) |
| Buttons | `font-semibold`, `tracking-[-0.2px]` (`Button`) |
| Card title | `text-[15px] font-semibold tracking-[-0.24px]` (`CardTitle`) |
| Card description | `text-[13px] leading-[1.38] text-[var(--text-tertiary)]` (`CardDescription`) |
| Time chip | `text-[15px] font-medium`; date prefix `text-[13px] opacity-70` (`TimeChip`) |
| Chat links (`ChatMessageText`) | `text-[var(--text-link)]`, underline, `break-all` on anchors |

**Rule of thumb:** Prefer **`text-[var(--text-primary)]` / `secondary` / `tertiary`** for copy hierarchy instead of raw grays.

---

## Color tokens

All of the following are defined under `:root` (light) and overridden under `html[data-theme="dark"]`.

### Surfaces

| Token | Light | Dark |
| --- | --- | --- |
| `--bg-primary` | `#FFFFFF` | `#000000` |
| `--bg-secondary` | `#F2F2F7` | `#1C1C1E` |
| `--bg-tertiary` | `#E5E5EA` | `#2C2C2E` |
| `--bg-sheet` | `rgba(255,255,255,0.97)` | `rgba(28,28,30,0.97)` |
| `--bg-calendar-cell` | `#FFFFFF` | `#1C1C1E` |
| `--bg-calendar-cell-hover` | `#F2F2F7` | `#2C2C2E` |
| `--bg-calendar-cell-active` | `#00E88F` | `#00FFA3` |
| `--bg-calendar-today` | `rgba(0,232,143,0.1)` | `rgba(0,255,163,0.1)` |

### Chat bubbles

| Token | Light | Dark |
| --- | --- | --- |
| `--bubble-sender` (user) | `#00E88F` | `#00FFA3` |
| `--bubble-sender-text` | `#003D24` | `#00331F` |
| `--bubble-receiver` (assistant) | `#E9E9EB` | `#2C2C2E` |
| `--bubble-receiver-text` | `#000000` | `#FFFFFF` |
| `--bubble-action` | `rgba(0,232,143,0.1)` | `rgba(0,255,163,0.1)` |
| `--bubble-action-border` | `rgba(0,232,143,0.3)` | `rgba(0,255,163,0.3)` |

### Text

| Token | Light | Dark |
| --- | --- | --- |
| `--text-primary` | `#000000` | `#FFFFFF` |
| `--text-secondary` | `#3C3C43` | `#EBEBF5` |
| `--text-tertiary` | `#8E8E93` | `#636366` |
| `--text-inverse` | `#FFFFFF` | `#000000` |
| `--text-link` | `#00C97A` | `#00FFA3` |

### Accents & status

| Token | Role | Light | Dark |
| --- | --- | --- | --- |
| `--accent-primary` | Brand / CTAs / focus | `#00E88F` | `#00FFA3` |
| `--accent-success` | Success highlight | `#E5FF3A` | `#F0FF3A` |
| `--accent-warning` | Warning | `#FF7A00` | `#FF8800` |
| `--accent-danger` | Destructive | `#FF1F3D` | `#FF2D4B` |

### Borders & dividers

| Token | Light | Dark |
| --- | --- | --- |
| `--divider` | `rgba(60,60,67,0.12)` | `rgba(235,235,245,0.08)` |
| `--border` | `rgba(60,60,67,0.18)` | `rgba(235,235,245,0.15)` |
| `--border-focused` | `#00E88F` | `#00FFA3` |

### Shadows

| Token | Light | Dark |
| --- | --- | --- |
| `--shadow-sheet` | Soft upward sheet | Stronger + green tint in dark |
| `--shadow-card` | Subtle card | Subtle + green hint in dark |
| `--shadow-elevated` | Modals / overlays | Deeper + green glow in dark |

### Inputs

| Token | Light | Dark |
| --- | --- | --- |
| `--input-bg` | `#F2F2F7` | `#2C2C2E` |
| `--input-border` | `rgba(60,60,67,0.18)` | `rgba(235,235,245,0.15)` |
| `--input-placeholder` | `#8E8E93` | `#636366` |

### Glow (dark emphasis)

| Token | Light | Dark |
| --- | --- | --- |
| `--glow-primary` | `none` | Green outer glow on key controls |
| `--glow-soft` | `none` | Softer green glow |

### Avatar

| Token | Value (both themes) |
| --- | --- |
| `--avatar-gradient-end` | `#00B86E` (paired with `--accent-primary` in a 135° gradient) |

---

## Spacing scale (`@theme inline`)

Tailwind spacing tokens (4px grid–aligned):

| Token | Value |
| --- | --- |
| `--spacing-0` | 0px |
| `--spacing-0_5` | 2px |
| `--spacing-1` | 4px |
| `--spacing-2` | 8px |
| `--spacing-3` | 12px |
| `--spacing-4` | 16px |
| `--spacing-5` | 20px |
| `--spacing-6` | 24px |
| `--spacing-8` | 32px |
| `--spacing-10` | 40px |
| `--spacing-12` | 48px |
| `--spacing-16` | 64px |

**In practice** many screens also use arbitrary Tailwind values (e.g. `px-3.5`, `py-2.5`, `gap-2`) for fine tuning.

---

## Border radius (`@theme inline`)

| Token | Value | Usage |
| --- | --- | --- |
| `--radius-xs` | 4px | Chat bubble corner nip (`rounded-br-[4px]` / `rounded-bl-[4px]`) |
| `--radius-sm` | 8px | Small controls |
| `--radius-md` | 12px | Chips, cards |
| `--radius-lg` | 18px | Large buttons |
| `--radius-xl` | 22px | — |
| `--radius-full` | 9999px | Pills, avatars, send button |

**Common Tailwind in repo:** `rounded-xl`, `rounded-2xl`, `rounded-[14px]`, `rounded-[20px]` (composer field).

---

## Shape & layout conventions

| Element | Pattern |
| --- | --- |
| Chat column | Full height flex; messages `px-4 py-1`; max bubble width **280px** |
| Chat bubbles | `rounded-2xl`; one corner **4px** toward thread edge |
| Modals / side panels | `rounded-2xl`, `border-[var(--border)]`, `bg-[var(--bg-secondary)]`, `shadow-[var(--shadow-elevated)]` |
| Lists / rows | `rounded-xl` rows, `border-[var(--border)]` |
| Dividers | `border-[var(--divider)]` on section edges |

---

## Motion & interaction

| Pattern | Implementation |
| --- | --- |
| Theme switch | `body` transitions `background` and `color` **0.3s** |
| Buttons | `transition-opacity duration-150`; hover `opacity-80`–`90`; **disabled** `opacity-40` + `pointer-events-none` |
| Time chips | `transition-all duration-150` |
| Focus ring | `focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focused)]` on `Button` |
| Text inputs | `focus:border-[var(--border-focused)]`, no ring (composer) |

---

## Core components

The sections below match **current implementations** (Tailwind classes and inline styles). Where a screen uses **raw Tailwind palette colors** (`bg-green-500`, `bg-blue-600`, `gray-*`) instead of `var(--…)`, that is called out so the guide stays honest.

### `components/ui/`

#### `Button`

- **Base:** `inline-flex items-center justify-center gap-2`, `font-semibold tracking-[-0.2px]`, `transition-opacity duration-150`, `cursor-pointer`, focus ring on `border-focused`, `disabled:opacity-40` + `pointer-events-none`.
- **`variant`:** `primary` — `bg-[var(--accent-primary)] text-white shadow-[var(--glow-soft)] hover:opacity-90`. `secondary` — `border-[1.5px] border-[var(--accent-primary)] bg-transparent text-[var(--accent-primary)] hover:opacity-80`. `ghost` — transparent + accent text, `hover:opacity-70`. `danger` — `bg-[var(--accent-danger)] text-white hover:opacity-90`.
- **`size`:** `sm` — `rounded-lg px-3.5 py-1.5 text-sm`. `md` — `rounded-xl px-5 py-2.5 text-base`. `lg` — `rounded-[14px] px-7 py-3.5 text-[17px]`. `icon` — `rounded-xl p-2.5`.

#### `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`

- **Card:** `rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-[var(--shadow-card)]`.
- **Header:** `flex flex-col gap-1 p-4 pb-2`.
- **Title:** `h3`, `text-[15px] font-semibold leading-tight tracking-[-0.24px]`.
- **Description:** `text-[13px] text-[var(--text-tertiary)] leading-[1.38]`.
- **Content:** `px-4 pb-4 pt-0`.
- **Footer:** `flex items-center gap-2 border-t border-[var(--divider)] p-4`.

#### `Avatar`

- **Layout:** `flex shrink-0 items-center justify-center rounded-full font-semibold text-white`.
- **Sizing:** `width` / `height` / `fontSize` from prop `size` (default **36**); `fontSize` = `size * 0.4`.
- **Fill:** inline `background: linear-gradient(135deg, var(--accent-primary), var(--avatar-gradient-end))`.

#### `UserAvatar`

- **With `photoURL`:** `img` with `shrink-0 rounded-full object-cover`, explicit `width`/`height` from `size` (default **32**).
- **Without photo:** delegates to `Avatar` with `name` (falls back to `"?"` if empty).

#### `TimeChip`

- **Base:** `rounded-xl px-4 py-2 text-[15px] font-medium transition-all duration-150`.
- **Unselected:** `border border-[var(--bubble-action-border)] bg-[var(--bubble-action)] text-[var(--text-link)]`.
- **Selected:** `bg-[var(--accent-primary)] text-[var(--bubble-sender-text)] shadow-[var(--glow-soft)]`.
- Optional **date** prefix: `mr-1 text-[13px] opacity-70` (inherits parent text color).

#### `CalendarCell`

- **Base:** `relative flex h-11 w-10 … rounded-[10px] text-base transition-all duration-150`.
- **`active`:** `bg-[var(--bg-calendar-cell-active)] text-[var(--bubble-sender-text)] font-semibold shadow-[var(--glow-soft)]`.
- **`today` (when not active):** `bg-[var(--bg-calendar-today)] font-semibold`.
- **Default hover:** `hover:bg-[var(--bg-calendar-cell-hover)]` when neither active nor today.
- **Event dot:** `mt-0.5 h-[5px] w-[5px] rounded-full` — white when `active`, else `bg-[var(--accent-primary)]`.

#### `SheetHandle`

- Wrapper: `flex justify-center pb-1 pt-2`.
- Pill: `h-[5px] w-9 rounded-full bg-[var(--text-tertiary)] opacity-40`.

#### `DevNav`

- **FAB:** `fixed top-4 left-4 z-[100]`, trigger `h-10 w-10 rounded-full bg-[var(--accent-primary)] text-white shadow-[var(--glow-primary)] hover:scale-105`.
- **Menu panel:** `rounded-xl border border-[var(--border)] bg-[var(--bg-sheet)] … shadow-[var(--shadow-elevated)] backdrop-blur-xl min-w-48`; section label `text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]`.
- **Nav rows:** active link `bg-[var(--accent-primary)] text-white`; inactive `text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]`.
- **Theme row:** `rounded-lg px-3 py-1.5 text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]`.
- **Backdrop:** full-screen transparent `button` to close.

### `components/chat/`

#### `ChatMessage`

- Row: `flex gap-2 px-4 py-1`; user `justify-end`, assistant `justify-start`.
- Assistant shows **`Avatar` “W”** at **28px** with `mt-1`.
- Bubble: `block w-fit max-w-[280px] min-w-0 rounded-2xl px-3.5 py-2 text-base leading-[1.35] tracking-[-0.32px]`; inner wrapper `min-w-0 break-words [word-break:break-word]`.
- **User:** `rounded-br-[4px] bg-[var(--bubble-sender)] text-[var(--bubble-sender-text)] shadow-[var(--glow-primary)]`.
- **Assistant:** `rounded-bl-[4px] bg-[var(--bubble-receiver)] text-[var(--bubble-receiver-text)]` (no glow).

#### `ChatMessageText`

- Detects `http(s)://` and `www.…`; renders `<a target="_blank" rel="noopener noreferrer">` with `text-[var(--text-link)]`, underline, `break-all`, focus ring `border-focused`.

#### `ChatBubble`

- Row: `flex mb-1`; sender `justify-end`, else `justify-start`.
- Inner: same max width, padding, typography as `ChatMessage` bubbles; **no avatar**; optional tail corners when `tail` is true.

#### `ActionBubble`

- Wrapper: `flex justify-end mb-1`.
- Button: `flex items-center gap-1.5 rounded-2xl border border-[var(--bubble-action-border)] bg-[var(--bubble-action)] px-4 py-2.5 text-[15px] font-medium text-[var(--text-link)] transition-opacity hover:opacity-80`.

#### `ChatInput`

- Bar: `flex items-end gap-2 border-t border-[var(--divider)] bg-[var(--bg-primary)] px-3 py-2`.
- **Textarea:** `min-h-[38px] max-h-[70px] flex-1 resize-none rounded-[20px] border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-[9px] text-base leading-[1.35] text-[var(--text-primary)] placeholder:text-[var(--input-placeholder)] focus:outline-none focus:border-[var(--border-focused)] overflow-y-auto`.
- **Send:** `h-[34px] w-[34px] rounded-full bg-[var(--accent-primary)] shadow-[var(--glow-primary)]`; disabled `opacity-30`; arrow stroke `var(--bubble-sender-text)`.

#### `ChatWindow`

- Scroll region: `flex min-h-0 flex-1 flex-col overflow-y-auto px-0 py-2`; renders `ChatMessage` list only (legacy / sample).

#### `ChatContent`

- Root: `flex-1 overflow-y-auto`.
- **Empty state:** intro `text-sm text-[var(--text-secondary)]`; suggestion rows `rounded-xl bg-[var(--bg-secondary)] … hover:bg-[var(--bg-tertiary)]`.
- **`InvitePreview` (inline):** card `rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 shadow-[var(--shadow-card)]`; primary CTA uses `--accent-primary`; secondary uses `--bg-tertiary` / `--divider` hover.

#### `AvailabilityHeatmap`

- Uses **semantic tokens** for chrome (`--text-*`, `--bg-tertiary`, headings).
- **Heat cells:** Tailwind **palette** classes (`bg-green-600`, `bg-yellow-500`, `gray-*`, etc.) — **not** CSS variables.

#### `SchedulingParticipantsBar`

- Bar: `flex shrink-0 flex-wrap items-center gap-2 border-t border-[var(--divider)] bg-[var(--bg-secondary)] px-4 py-2`.
- **Pills:** `rounded-full border border-[var(--border)] bg-[var(--bg-tertiary)] … text-xs`.

### `components/sidebar/`

#### `Sidebar`

- **Aside:** `fixed … w-[260px] … border-r border-[var(--divider)] bg-[var(--bg-secondary)]`; mobile translate; `md:static`.
- **Scrim:** `bg-black/50 md:hidden` when open.

#### `NewEventButton`

- `Button` `variant="secondary"` `size="md"`, `w-full justify-start`.

#### `EventList`

- Row: `rounded-lg px-3 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]`.

### `components/events/`

#### `EventCard`

- Uses **`Card`**; status chip: `rounded-md bg-[var(--bubble-action)] … text-[var(--text-link)]`.

#### `AddFriendsModal`

- Overlay `bg-black/60`; dialog `rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] shadow-[var(--shadow-elevated)]`.
- Search input uses `--input-*` and `focus:border-[var(--border-focused)]`.

### `components/network/`

#### `NetworkPickerModal`

- Same modal shell pattern as `AddFriendsModal`; connection rows `rounded-xl border border-[var(--border)]`.

### `components/layout/`

#### `UserMenu`

- Dropdown: `rounded-xl border border-[var(--border)] bg-[var(--bg-sheet)] shadow-[var(--shadow-elevated)]`; menu items `hover:bg-[var(--bg-tertiary)]`.

### `components/events/`

#### `EventAvailabilityGrid`, `EventGroupHeatmap`

- **Layout:** Poll tables use **`w-full table-fixed`** with **`colgroup`** (fixed time column + flexible day columns). Avoid **`mx-auto w-fit`** so grids fill the card width.
- **Sticky chrome:** Time column and corner headers use **`bg-[var(--bg-tertiary)]`** to match the surrounding **`Card`**, not `--bg-primary`.
- **Time axis:** Default slots are **9:00–17:00** half hours, aligned with **`lib/parse-availability`** and **`lib/event-grid-slots`**. Optional **`earliestTime` / `latestTime`** on the event are shown as copy only until slot indexing is generalized.

### `components/calendar/`

#### `AvailabilityGrid`, `CalendarHeatmap`, `CalendarView`, `CalendarEventsList`, Google connect/disconnect, `UserCalendarView`, `UserCalendarHeatmap`, `MyCalendarEvents`

- Heavy use of **`var(--…)`** for surfaces, text, borders; some blocks use **`color-mix`** with `--accent-primary` for heat intensity.
- **Exceptions:** `AvailabilityHeatmap` and `UserCalendarHeatmap` use default **gray/green** Tailwind palette in places; `UserCalendarView` signed-out CTA may use **blue** — see below.

---

## Icons

- Inline **SVG** with `stroke="currentColor"` (or explicit `var(--…)`) so icons follow text/accent color.
- Typical stroke width **1.5–2** for UI icons.

---

## `color-scheme`

- `:root` sets `color-scheme: light`.
- Dark block sets `color-scheme: dark` so native scrollbars and form controls match.

---

## Do / don’t

**Do**

- Use **`var(--token)`** for any color, border, or shadow that should track theme.
- Use **`cn()`** from `lib/utils.ts` to merge Tailwind classes.
- Keep new surfaces aligned with **`--bg-*`** and text with **`--text-*`** hierarchy.

**Don’t**

- Hard-code hex or default palette colors for UI that must support both themes — unless you are intentionally matching a legacy block (see **Known theme exceptions** below).
- Bypass tokens for primary CTAs (use `--accent-primary`).

### Known theme exceptions (technical debt)

These files still mix **Tailwind default colors** (`gray-*`, `green-*`, `blue-600`, `bg-white` / `dark:bg-gray-900`) with the token system. New work should prefer `var(--…)` and match [`app/globals.css`](../app/globals.css).

- [`components/chat/AvailabilityHeatmap.tsx`](../components/chat/AvailabilityHeatmap.tsx) — heatmap fills and tooltips.
- [`components/calendar/UserCalendarHeatmap.tsx`](../components/calendar/UserCalendarHeatmap.tsx) — loading / empty shells.
- [`components/calendar/UserCalendarView.tsx`](../components/calendar/UserCalendarView.tsx) — signed-out “Sign In” button.

---

## Related files

| File | Purpose |
| --- | --- |
| `app/globals.css` | All CSS variables and `@theme` |
| `app/layout.tsx` | Font variable, root `data-theme` |
| `lib/theme.tsx` | Client theme toggle |
| `lib/utils.ts` | `cn()` class merger |
| `docs/components.md` | Component inventory |

When you add new tokens, **update this guide and `globals.css` together** so they stay in sync.
