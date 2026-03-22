# Overview

## Intent

**Chat2meet** helps individuals and groups find meeting times using a conversational AI flow, completely replacing the static "When2Meet" style interaction. Instead of manually filling out a grid, users chat with a Gemini 2.0 Agent that natively understands their preferences, interacts with their selected Google Calendar, and autonomously proposes the best slots.

## Precious Works & Core Features Built
- **Agentic AI Scheduling:** Vercel AI SDK integrated with Google's Gemini 2.0 to handle natural language scheduling and execute tool calls (e.g., checking overlaps, proposing times).
- **The Ghost Grid:** An interactive 7-day availability matrix (Sunday-Saturday) where users paint their soft working constraints.
- **Smart Calendar Sync & Selection:** Full Google Calendar integration via OAuth2 where users can explicitly select *which* calendar (Work, Personal, Primary) acts as their hard source of truth.
- **Real-Time 3-Column Cockpit:** A Glassmorphism UI where the left column manages Networks/Groups, the center runs the Agent chat, and the right column provides a live-synced Proof via the connected Google Calendar.

## Stack

- **Framework:** Next.js 15 (App Router), React 19, TypeScript
- **AI / Brain:** Vercel AI SDK Core (`ai`, `@ai-sdk/google`, `@ai-sdk/react`)
- **Fonts:** [Inter](https://fonts.google.com/specimen/Inter) via `next/font`
- **Styling:** Tailwind CSS v4 featuring premium Glassmorphism styling (`app/globals.css`)
- **Data (Memory):** Firebase **Firestore** (`users`, `networks`, `ghostGrid`, `calendarAccounts`) + Firebase Auth
- **External APIs:** Google APIs (`googleapis` v171) for Calendar fetching & token management.

## Repository Layout

```text
app/                  # Pages, AI Streaming routes (api/chat), Calendar routes, Auth
components/           # Chat interface, Ghost Grid, Google Calendar Connect UI
lib/                  # Firebase admin, Mock data, AI utilities, Calendar serverside Core
scripts/              # Env loaders, Firestore seeders
docs/                 # Project documentation (Agent memory rules)
public/               # Static assets
```

## Backend (High Level)

- **AI Chat Streaming:** `POST /api/chat/route.ts` streams LLM output and executes structured tool calls.
- **Google Calendar Routes:** `GET/POST /api/calendar/google/*` handles OAuth, fetching the `calendarList`, keeping tokens fresh, and routing events to the user's `selectedCalendarId`.
- **Availability Core:** `calendar-availability-core.ts` computes true available gaps by merging the Ghost Grid boundaries with actual Google Calendar events.
- **Database Rules:** Standard CRUD using the `firebase-admin` SDK ensuring secure reads/writes of user constraints.
