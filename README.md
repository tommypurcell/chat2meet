# 🚀 Chat2meet: Scheduling, Reimagined
> **The Series A Pitch Deck** — *Solving the $500B Meeting Negotiation Problem.*

---

## 🛑 Slide 1: The Problem
### "Scheduling is where productivity goes to die."
Traditional tools like When2Meet or static calendars rely on a **"Grid of Death"**—a manual, high-friction process of clicking boxes and cross-referencing tabs. 
- **Friction**: Users hate filling out grids.
- **Opacity**: You can't explain *why* you're busy to a grid.
- **Static**: Typical tools don't know about your nuances (e.g., "Never on Mondays").

---

## 💡 Slide 2: The Solution
### **Chat2meet: The World's First Agentic Scheduling Platform.**
We've replaced the grid with an **Intelligent Agent** that lives where you do: in the chat. 
- **Conversational**: "Find a time for coffee with Sarah next week."
- **Context-Aware**: Knows your Google Calendar, your preferences, and your "secret" rules.
- **Frictionless**: Zero-setup onboarding via natural language.

---

## 🛠 Slide 3: The Product (Current MVP)
### **The 3-Column Powerhouse**
1.  **The Context (Left)**: Instantly access cross-functional meeting groups (Pickleball crew, Design Review, 1:1s).
2.  **The Agent (Center)**: A Gemini 2.0-powered assistant that fetches schedules, finds overlaps, and suggests times.
3.  **The Source of Truth (Right)**: A live-synced, persistent **Google Calendar Sidebar** that updates as you chat.

---

## 🧠 Slide 4: Our Unfair Advantage
### **The Private Preference Engine**
Traditional tools are public. Chat2meet is **Private**.
- **The Grid 2.0**: Select your "Preferred slots" on our interactive grid.
- **Agent Memory**: These slots are injected directly into the Agent's private prompt. 
- **Secret Rules**: "i'll never go to a meeting with Daniel"—Your agent knows, but Daniel doesn't.

---

## 🔗 Slide 5: Deep Integration
### **Google Calendar API Native**
We don't just "import" calendars; we live in them.
- **Real-time Sync**: Fetch busy blocks instantly.
- **Persistent Selection**: Your chosen availability is saved to Firestore and synced across sessions.
- **Auto-Update**: As you book meetings, the Agent adjusts its logic in real-time.

---

## 📈 Slide 6: The Vision
### **From "Finding Time" to "Finding Value"**
Chat2meet isn't just a scheduler; it's a **Meeting Orchestrator**. 
- **Phase 1**: Solve the "When". (COMPLETED ✅)
- **Phase 2**: Solve the "Who" (Network effects, automated invites). (IN PROGRESS ⏳)
- **Phase 3**: Solve the "Why" (Automated agendas, AI-prep).

---

## 🛠 Tech Stack (The "Engine Room")
- **Frontend**: Next.js 15 (App Router), Tailwind CSS.
- **Intelligence**: Vercel AI SDK, Gemini 2.0 Flash Lite.
- **Infrastructure**: Firebase (Auth, Firestore), Google Calendar API.
- **Design**: Premium "Glassmorphism" UI with dark-mode native aesthetics.

---

## 🏁 Get Started
```bash
npm install
npm run dev
```

**Chat2meet** — *Schedule meetings through chat. No grid required.*
