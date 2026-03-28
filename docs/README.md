# Documentation

Use this file as the **index**. Canonical technical detail lives in the linked files; some **planning** and **audit** notes are historical—check dates and verify against the codebase when in doubt.

## Start here

| Document | Description |
| --- | --- |
| [setup.md](./setup.md) | Install, `.env`, Firebase keys, `db:seed` |
| [overview.md](./overview.md) | Product intent, tech stack, repository layout |
| [architecture.md](./architecture.md) | Request flow, Firebase Admin, key `lib/` modules, Firestore notes |

## Reference

| Document | Description |
| --- | --- |
| [api.md](./api.md) | HTTP routes under `app/api/**` (CRUD, auth, chat, calendar) |
| [components.md](./components.md) | `components/` folders and notable UI modules |
| [styleguide.md](./styleguide.md) | CSS tokens (`globals.css`), typography, component styling patterns |
| [building-on-this-version.md](./building-on-this-version.md) | Practical contributor guide: current flows, guardrails, and easy things to break |
| [features.md](./features.md) | Full feature inventory + “what not to break” for implementers |
| [firebase-mvp.md](./firebase-mvp.md) | Firestore schema, seeding, MVP rules |

## Calendar & agent

| Document | Description |
| --- | --- |
| [agent-flow.md](./agent-flow.md) | Agent personas, guest vs logged-in flows, tools, and prompt rules (`/api/chat`, test-chat, onboarding) |
| [calendar-agent-integration.md](./calendar-agent-integration.md) | Scheduling agent: tools, calendar context, chat payload, chips & heatmap |
| [testing-agent-calendar.md](./testing-agent-calendar.md) | Manual checks for Google Calendar + agent behavior |
| [google-calendar-setup.md](./google-calendar-setup.md) | OAuth and Google Calendar connection |
| [calendar-quickstart.md](./calendar-quickstart.md) | Longer walkthrough of calendar features |

## Planning, audits & skills

| Document | Description |
| --- | --- |
| [ONBOARDING_FLOW_PLAN.md](./ONBOARDING_FLOW_PLAN.md) | Onboarding flow planning |
| [calendar-integration-plan.md](./calendar-integration-plan.md) | Calendar integration planning |
| [llm-calendar-audit.md](./llm-calendar-audit.md) | Point-in-time LLM/calendar audit; **verify** claims against current `app/api/chat` and calendar routes |

### Skills (how to integrate other calendars)

| Document | Description |
| --- | --- |
| [skills-how-to-integrate-calendars/integrate-google-calendar.md](./skills-how-to-integrate-calendars/integrate-google-calendar.md) | Google Calendar notes |
| [skills-how-to-integrate-calendars/integrate-outlook-calendar.md](./skills-how-to-integrate-calendars/integrate-outlook-calendar.md) | Outlook notes |
| [skills-how-to-integrate-calendars/integrate-apple-calendar-icloud-caldav.md](./skills-how-to-integrate-calendars/integrate-apple-calendar-icloud-caldav.md) | Apple / CalDAV notes |

---

**Suggested reading order:** [setup.md](./setup.md) → [overview.md](./overview.md) → [calendar-agent-integration.md](./calendar-agent-integration.md) for scheduling work.
