# 🚀 Chat2meet: KILL THE GRID.
### *Scheduling meetings isn't a chore. It's a conversation.*

---

## 💀 The Vision: The Grid is Dead
Stop clicking boxes. Stop checking your tabs. Stop the "Does Tuesday work?" back-and-forth.

We are in the age of Agentic AI. Manually filling out 1990s-style availability grids is archaic. **Chat2meet** is the eviction notice for traditional scheduling. Imagine a world where you just **talk** to your calendar:
> *"Hey, find 30 mins for me and the marketing team next week. I prefer mornings, but don't tell them I'm actually free all day Friday—keep that for my deep work."*

Chat2meet doesn't just "schedule." It **understands, analyzes, and executes.** 

---

## ✨ Comprehensive Feature Matrix

### 1. ⚡️ The 3-Column Powerhouse (The Cockpit)
We built the most efficient scheduling cockpit ever designed, bringing everything into a single, real-time pane of glass:
- **LEFT (Context & Network):** Manage your friends, networks, and groups. Create custom circles of colleagues or friends and know exactly who you are scheduling with.
- **CENTER (Intelligence):** The Gemini 2.0-powered Chat Interface. Interacts naturally with the user, fetches schedules in the background, checks overlaps across multiple participants, and proposes the perfect time instantly.
- **RIGHT (Proof):** A live-synced, persistent Google Calendar sidebar that updates in real-time. Watch your schedule evolve dynamically as your agent negotiates the meeting.

### 2. 🦄 The Private Memory Advantage & The Ghost Grid
Scheduling requires nuance. Everyone else relies on public rigid calendars. We give you a **Private Brain**:
- **The Ghost Grid:** An interactive 7-day availability grid (Sunday to Saturday) to paint your "soft" constraints (e.g., preferred working hours).
- **Persistent Memory:** Your grid preferences are saved directly to Firestore and fed *only* to your AI Agent.
- **Invisible Rules:** Your Agent knows your private preferences (e.g., "No meetings before 10 AM") and silently guards your time against invitations, only exposing available overlap.

### 3. 🗓️ Smart Calendar Selection & Overlap Core
Not all events belong in the primary calendar. We've completely rebuilt the calendar routing to be granular and smart:
- **Native Google Calendar Integration:** Connect securely via OAuth2, with end-to-end encrypted token storage.
- **Granular Calendar Selection (New):** You can explicitly fetch your entire Google Calendar list and designate specific calendars (Primary, Work, Personal) to accurately dictate what blocks your availability. 
- **Real-Time Free/Busy Core (Algorithm):** Our custom backend algorithm (`calendar-availability-core.ts`) cross-references your Ghost Grid rules with your specifically selected Google Calendar to compute true, dynamically calculated free-time gaps.

### 4. 🧠 Agentic Flow (Vercel AI SDK)
- **Deep SDK Integration:** Built using `generateText` and `streamText` to create a seamless, non-blocking conversational UI.
- **Structured Tool Calling:** The AI is equipped with tools allowing it to dynamically query calendars, compare availabilities across multiple `user_id`s, and book events autonomously directly into Google Calendar.

---

## 🏗 System Architecture & Technology Stack

Designed for the $500B Meeting Economy, the stack is Edge-native, highly available, and deeply integrated:

### Frontend & UI
- **Framework:** Next.js 15 (App Router, Server Actions, Edge-native).
- **React:** React 19 for concurrent rendering and hook-based state management.
- **Styling:** Tailwind CSS v4 powering a premium **Glassmorphism** component library. Translucent panes, dynamic gradient backgrounds, and micro-animations provide a state-of-the-art aesthetic.

### Backend & AI Core
- **Brain Engine:** Google Gemini 2.0 invoked via Vercel AI SDK Core.
- **Data Mutation:** Firebase Admin SDK securely validating sessions, while the client uses Firebase v12 for real-time reactivity.
- **Database Schema (Firestore):**
  - `/users/{uid}/calendarAccounts`: Encrypted OAuth tokens and designated `selectedCalendarId`.
  - `/users/{uid}/ghostGrid`: Saved weekly soft constraints.
  - `/networks`: Cross-user relationship matrices.

### External APIs
- **Google Calendar (googleapis v171):** Handles `calendarList`, `events.list`, and `freebusy` queries. OAuth 2.0 ensures secure delegated access.

---

## 📂 Project Structure
```text
/app
 ├── /api/auth             # Firebase session management
 ├── /api/calendar         # Google API endpoints & heatmap logic
 ├── /api/chat             # Vercel AI SDK Streaming routes
 ├── /auth, /settings      # User authentication & preferences screens
/components
 ├── /calendar             # Ghost Grid, Google Calendar Connect & Views
 ├── /chat                 # Chat2meet messaging UI, agent streaming
 ├── /ui                   # Glassmorphic primitives (Buttons, Inputs, Modals)
/lib
 ├── calendar-server.ts              # Google Calendar secure fetchers
 ├── server/calendar-availability.ts # Free-gap calculation algorithm
 ├── auth-context.tsx                # Firebase React Context
```

---

## 🚀 The Mission & Recent Updates (Branch: rae-1913)
Our team is constantly pushing updates to automate onboarding and perfect overlap detection. Recent achievements include:
1. **7-Day Grid Expansion:** Increased the Ghost Grid availability map from Mon-Fri (5-day) to full Sun-Sat (7-day) tracking.
2. **Explicit Calendar Routing:** Users are no longer forced to use the default `"primary"` calendar. By fetching the user's `calendarList`, Chat2meet now strictly isolates events based on a dedicated `selectedCalendarId`.
3. **UI Streamlining:** Cleaned up excessive dev-toggle menus to focus purely on the core 3-column interaction model.

**Next step? Total scheduling domination.**

---

## 💻 Getting Started

### Prerequisites
- Node.js (v20+)
- Firebase Project configured (with Firestore Database and Authentication enabled)
- Google Cloud Project with the Google Calendar API enabled, returning an OAuth Client ID/Secret.

### Setup & Launch
```bash
# Clone the repository & Install dependencies
npm install

# Set up your environment variables
cp .env.example .env.local
# (Populate your Firebase config, Google Client credentials, and NextAuth secrets in .env.local)

# Run the development server
npm run dev
```

**Chat2meet** — *Stop Grid-ing. Start Meeting.*
