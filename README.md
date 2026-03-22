# 🚀 Chat2meet: KILL THE GRID.
### *Scheduling meetings isn't a chore. It's a conversation.*

---

## 💀 The Grid is Dead.
Stop clicking boxes. Stop checking your tabs. Stop the "Does Tuesday work?" back-and-forth.

We're in the age of Agentic AI. Why are we still manually filling out 1990s-style availability grids? **Chat2meet** is the eviction notice for the traditional scheduling "negotiation." 

---

## 🔥 The New Reality: Conversation-First
Imagine a world where you just **talk** to your calendar. 
> *"Hey, find 30 mins for me and the marketing team next week. I prefer mornings, but don't tell them I'm actually free all day Friday—keep that for my deep work."*

Chat2meet doesn't just "schedule." It **understands, analyzes, and executes.** 

---

## ✨ Features Powering the Future of Scheduling

### 1. ⚡️ The 3-Column Powerhouse (The Cockpit)
We built the most efficient scheduling cockpit ever designed, bringing everything into a single pane of glass:
- **LEFT (Context):** Manage your networks, groups, and friends. Know exactly who you are scheduling with.
- **CENTER (Intelligence):** The Gemini 2.0-powered Chat Agent. It fetches schedules, checks overlaps across multiple participants, and proposes the perfect time instantly.
- **RIGHT (Proof):** A live-synced, persistent Google Calendar sidebar that updates in real-time as your agent negotiates the schedule.

### 2. 🦄 The Private Memory Advantage & The Ghost Grid
Scheduling with nuance. Everyone else relies on public rigid calendars. We give you a **Private Brain**:
- **The Ghost Grid:** An interactive 7-day availability grid to paint your "soft" constraints.
- **Persistent Memory:** Your grid preferences are saved to Firestore and fed *only* to your Agent.
- **Invisible Rules:** Your Agent knows your private preferences (e.g., "No meetings before 10 AM") even if you haven't stated it recently. It guards your time while finding slots.

### 3. 🗓️ Smart Calendar Selection & Sync
We don't just dump all your events into one bucket.
- **Native Google Calendar Integration:** Connect securely via OAuth2, with encrypted token storage.
- **Granular Calendar Selection:** Choose specific calendars (Primary, Work, Personal) to accurately designate which events block your availability.
- **Real-Time Free/Busy Core:** Our custom backend algorithm cross-references the Ghost Grid with your selected Google Calendar to compute true free-time gaps dynamically.

### 4. 🧠 Vercel AI SDK + Agentic Flow
- Deep integration with `generateText` and `streamText` to create a seamless conversation.
- Structured Tool Calling capabilities allow the Agent to dynamically query calendars, compare availabilities, and book events autonomously.

### 5. 👥 Effortless Network & Team Management
- **Friends & Groups:** Add friends and create groups effortlessly. Let the AI compare availabilities across the entire network to find intersection points.

---

## 🛠 Built for the $500B Meeting Economy
The stack that powers the tool:
- **Brain**: Vercel AI SDK Core + Google Gemini 2.0.
- **Nervous System**: Next.js 15 (App Router, API Routes, Edge-native).
- **Memory**: Firebase (Real-time Firestore for preferences & auth). Node `crypto` for encrypted token storage.
- **Connectivity**: Native Google APIs (`googleapis`) & strict OAuth 2.0.
- **Design**: Premium Glassmorphism UI styling built with Tailwind CSS v4, providing an immersive, state-of-the-art aesthetic.

---

## 🚀 The Mission: Zero-Friction Scheduling.
Our team is constantly pushing updates to automate onboarding, automate synchronization, and perfect overlap detection. 

**Next step? Total scheduling domination.**

---

## 💻 Getting Started

### Prerequisites
- Node.js (v20+)
- Firebase Project configured (with Firestore and Auth enabled)
- Google Cloud Project with the Google Calendar API enabled and OAuth credentials

### Setup & Launch
```bash
# Install dependencies
npm install

# Set up your environment variables
cp .env.example .env.local
# (Make sure to populate your Firebase and Google Client credentials in .env.local)

# Run the development server
npm run dev
```

**Chat2meet** — *Stop Grid-ing. Start Meeting.*
