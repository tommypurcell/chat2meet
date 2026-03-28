# Onboarding Flow Plan

## Core Strategy
**Let users start fast, ask only for name first, and delay real account creation until they are invested.**

---

## User Journey

### Phase 1: Guest Discovery (No Auth Required)

#### Step 1: Guest lands on homepage
- **Current state**: Login wall at `/auth`
- **New state**: Real chat UI immediately visible
- **What they see**:
  - Full chat interface (not a demo)
  - Example prompts to get started
  - No signup required to begin

#### Step 2: Guest starts chatting
- Guest types what they want to schedule
- Examples:
  - "Find time for coffee with Janet next week"
  - "Schedule team standup for 30 min"
  - "When can I meet with 3 people next Tuesday?"

#### Step 3: Agent asks for name early
- **Agent prompt**: "I'd love to help! What's your name?"
- Guest enters name (e.g., "Tommy")
- **System action**: Create temporary guest session
  - Store in `sessionStorage` or temporary Firebase doc
  - Generate temporary guest ID
  - No email/password required yet

#### Step 4: Guest continues building meeting
- Agent helps shape the request through conversation
- Guest can:
  - Describe the meeting purpose
  - Add participant names/emails (stored temporarily)
  - Choose date range
  - Set duration
  - Optionally describe availability constraints

#### Step 5: Availability collection decision point
- **Agent asks**: "How would you like to share your availability?"
  - Option A: "Connect my calendar" (requires signup)
  - Option B: "I'll enter times manually" (can stay guest)
  - Option C: "Skip for now"

- **If manual**: Guest can continue without signup
  - Agent asks for free time windows
  - Stores in draft meeting

### Phase 2: Conversion Triggers (Signup Required)

Guest can explore freely, but signup is triggered when they try to:
1. **Save the meeting** (persist beyond session)
2. **Invite people** (send actual invites)
3. **Connect calendar** (OAuth flow)
4. **Come back later** ("Let's save your progress...")

#### Signup Modal
- **Appears when**: Guest hits a conversion trigger
- **Message**: "You're off to a great start! Create an account to save this meeting."
- **Shows**:
  - What they've built so far (meeting summary)
  - Quick signup form (email + password OR Google/social)
  - "Already have an account? Log in"

### Phase 3: Account Creation & Session Migration

#### After signup/login:
1. **Migrate guest session** to real account
   - Draft meeting → Firestore `events` collection
   - Chat history → User's chat storage
   - Participant names → User's network (as unconfirmed)
   - Temporary guest ID → Real Firebase UID

2. **Begin post-signup onboarding** (3 quick steps)

---

## Post-Signup Onboarding Flow

### Step 1: Connect Calendar (or Skip)
- **Screen**: Calendar connection card
- **Options**:
  - "Connect Google Calendar" → OAuth flow
  - "I'll do this later" → Skip to step 2
- **Why this first**: Most valuable for automation

### Step 2: Add People (or Skip)
- **Screen**: Network builder
- **Options**:
  - "Add a few people manually" → Name + Email form
  - "Import from Google Contacts" → OAuth (if calendar connected)
  - "Skip for now"
- **Default**: Pre-populate with names mentioned in draft meeting

### Step 3: Set Preferences (or Skip)
- **Screen**: Quick preferences
- **Fields**:
  - Timezone (auto-detected, confirm)
  - "No meetings before": Time picker (e.g., 9:00 AM)
  - "No meetings after": Time picker (e.g., 6:00 PM)
  - "Preferred meeting buffer": 15/30/60 min
- **All optional** with smart defaults

### Step 4: Return to Draft Meeting
- User lands back on home with:
  - Their draft meeting ready to finalize
  - Chat context preserved
  - Selected participants ready
  - Agent prompts: "Ready to send invites?"

---

## Questions & Decisions

### 1. Guest Session Storage
**Q**: Where do we store guest session data before signup?

**Options**:
- A. `sessionStorage` (lost on tab close)
- B. `localStorage` (persists across sessions, same browser)
- C. Anonymous Firebase doc with expiration (24-48 hours)
- D. Combination: localStorage + Firebase for persistence

**Recommendation**: **Option D**
- Store in localStorage for instant access
- Also create anonymous Firebase doc for cross-device (via magic link)
- Auto-expire after 48 hours if no signup

---

### 2. Guest Identity
**Q**: How do we identify guest users uniquely?

**Options**:
- A. Generate random UUID in browser
- B. Firebase Anonymous Auth
- C. Email provided during conversation (before signup)

**Recommendation**: **Option B** (Firebase Anonymous Auth)
- Provides real Firebase UID
- Can upgrade to permanent account via `linkWithCredential()`
- Handles session persistence automatically
- Allows Firestore security rules

---

### 3. Name Collection Timing
**Q**: When exactly should the agent ask for the guest's name?

**Options**:
- A. Immediately after first message
- B. After understanding what they want to schedule
- C. Only when needed (e.g., creating meeting)

**Recommendation**: **Option B**
- Let them state their need first (1-2 messages)
- Then ask: "Great! I'm [Agent Name]. What's your name?"
- Feels more natural, less interrogative

---

### 4. Participant Data Before Signup
**Q**: How do we handle participants mentioned before signup?

**Scenario**: Guest says "I want to meet with Janet and Bob"

**Options**:
- A. Store as plain text names, ask for emails later
- B. Ask for emails immediately during chat
- C. Create placeholder "contacts" in guest session

**Recommendation**: **Option A + C**
- Store names immediately (less friction)
- Create temporary contact objects in guest session
- After signup, prompt: "Let's add email addresses for Janet and Bob"

---

### 5. Availability Input Without Calendar
**Q**: How do guests enter manual availability?

**Options**:
- A. Agent asks in chat: "When are you free next week?"
  - Guest types: "Monday 2-5pm, Wednesday morning"
  - Agent parses natural language
- B. Show visual time picker in chat
- C. Both: Agent asks, but shows picker as fallback

**Recommendation**: **Option C**
- Start with natural language (faster, more conversational)
- If parsing fails or guest prefers, show picker UI
- Display selected times as "time chips" for confirmation

---

### 6. Conversion Trigger Priority
**Q**: Which conversion trigger should we optimize for?

**Scenario**: Guest has built draft meeting. What makes them sign up?

**Priority Order**:
1. **"Invite [name]"** - Highest intent, ready to send
2. **"Connect calendar"** - Clear need for persistence
3. **"Save this"** - Explicit save action
4. **"Come back later"** - Passive trigger on tab close/navigate away
5. **Time limit** - After 30 min in guest mode (gentle prompt)

---

### 7. Onboarding Skip Flow
**Q**: Can users skip ALL onboarding steps?

**Options**:
- A. Yes, but show persistent "Complete setup" banner
- B. No, must connect calendar OR add 1 person OR set preferences
- C. Yes, no nagging (trust them to return)

**Recommendation**: **Option A**
- Allow full skip (respect user agency)
- Show dismissible banner: "👋 Finish setup to unlock [feature]"
- Re-prompt only at logical times (e.g., when trying to use that feature)

---

### 8. Network Import During Onboarding
**Q**: Should we auto-import contacts from Google after calendar connection?

**Options**:
- A. Yes, automatically (faster)
- B. Ask permission first
- C. Make it a separate step after calendar

**Recommendation**: **Option B**
- After calendar OAuth success, show:
  - "✓ Calendar connected!"
  - "Would you also like to import contacts from Google?"
  - [Import Contacts] [Skip]
- Respects privacy, clear value prop

---

### 9. Draft Meeting Visibility
**Q**: Where does the draft meeting live during guest mode?

**Options**:
- A. Only in chat (implicit)
- B. Show "Draft Meeting" card in sidebar
- C. Separate "Your Meeting" panel

**Recommendation**: **Option B**
- Add "Draft Meeting" section in sidebar (like saved events)
- Shows:
  - Title (or "Untitled meeting")
  - Participants mentioned
  - Date range if set
  - [Continue →] button
- Makes progress tangible, encourages completion

---

### 10. Guest Session Expiration
**Q**: What happens to guest sessions that never convert?

**Options**:
- A. Delete after 24 hours
- B. Delete after 7 days
- C. Keep forever (orphaned data)
- D. Send email reminder if email was captured

**Recommendation**: **Option A + D**
- If guest provided email during chat (even without signup):
  - Send reminder at 12 hours: "Finish your meeting with Janet?"
  - Include magic link to resume session
- Delete anonymous Firebase docs after 24 hours
- Clear localStorage on explicit "Clear" action

---

### 11. Agent Personality During Guest Mode
**Q**: Should the agent behave differently for guests vs. logged-in users?

**Options**:
- A. Yes, more helpful/encouraging for guests
- B. No, consistent experience
- C. Slightly different: Guest mode focuses on "quick start" prompts

**Recommendation**: **Option C**
- Guest mode: More examples, proactive suggestions
  - "Try: 'Find time for coffee with a friend'"
  - "I can help you schedule without signing up first!"
- Logged-in: Assumes familiarity, more concise

---

### 12. Social Proof During Guest Mode
**Q**: Should we show social proof to encourage signup?

**Examples**:
- "Join 10,000+ users scheduling smarter"
- "Trusted by teams at Google, Stripe, ..."

**Options**:
- A. Yes, show during conversion trigger modal
- B. No, feels salesy
- C. Subtle: Show in footer only

**Recommendation**: **Option C**
- Keep chat experience clean
- Add subtle footer: "Chat2Meet · 10K+ meetings scheduled"
- Emphasize value, not hype

---

## Implementation Phases

### Phase 1: Guest Mode Foundation (Week 1)
- [ ] Remove auth wall from homepage
- [ ] Implement Firebase Anonymous Auth for guests
- [ ] Add "guest session" state management
- [ ] Store draft meeting in localStorage + Firestore
- [ ] Agent prompt: Ask for name after 2nd message
- [ ] Display guest name in UI

### Phase 2: Conversion Triggers (Week 1-2)
- [ ] Detect conversion trigger actions
- [ ] Build signup modal with session preview
- [ ] Implement session migration on signup
- [ ] Link anonymous auth to permanent account
- [ ] Preserve chat history and draft meeting

### Phase 3: Post-Signup Onboarding (Week 2)
- [ ] Calendar connection step (with skip)
- [ ] Network import step (with skip)
- [ ] Preferences step (with skip)
- [ ] "Return to draft" final step
- [ ] Track onboarding completion

### Phase 4: Polish & Optimization (Week 3)
- [ ] Draft meeting sidebar card
- [ ] Guest session expiration + cleanup
- [ ] Email reminder for abandoned sessions
- [ ] Analytics: Track conversion funnel
- [ ] A/B test: Conversion trigger timing

---

## Open Questions

1. **Multi-device guest sessions**: Should guests get a "magic link" to continue on another device?
   - Pros: Better UX, cross-device
   - Cons: Requires email earlier

2. **Guest chat history**: Do we show previous guest sessions when they return?
   - Scenario: Guest uses app, leaves, comes back (same browser)
   - Options: Resume last session, start fresh, or ask?

3. **Guest participant matching**: If guest mentions "Janet" and later creates account, should we auto-match to real Janet in their network?
   - Risk: False positives (wrong Janet)
   - Benefit: Seamless experience

4. **Calendar preview for guests**: Can we show a mock calendar view without auth?
   - Could help visualize the meeting
   - Risk: Confusion (not real data)

5. **Pricing/plans during guest mode**: When do we mention pricing?
   - Option A: Never (until after signup)
   - Option B: During conversion ("Free for up to 5 meetings/month")
   - Option C: In footer only

---

## Success Metrics

### Guest Engagement
- **Guest sessions started**: # of anonymous users
- **Name provided**: % of guests who share name
- **Draft meeting created**: % who build a full meeting
- **Time to name ask**: Avg messages before agent asks name

### Conversion
- **Guest → Signup rate**: % of guests who create account
- **Trigger breakdown**: Which trigger converts best?
  - Invite sent
  - Calendar connect
  - Save meeting
  - Come back later
- **Time to conversion**: Avg minutes in guest mode before signup

### Onboarding Completion
- **Calendar connected**: % of new users
- **Network imported**: % of new users
- **Preferences set**: % of new users
- **Full onboarding**: % who complete all 3 steps
- **Onboarding drop-off**: Where do users skip?

### Retention
- **Day 1 return**: % who come back next day
- **Meeting sent**: % who actually send their first invite
- **Week 1 active**: % active within first week

---

## Next Steps

1. **Review this plan** and answer open questions
2. **Prioritize** which features are MVP vs. nice-to-have
3. **Design** key screens (guest mode, conversion modal, onboarding steps)
4. **Implement** Phase 1 (guest mode foundation)
5. **Test** with real users (even 5-10 people)
6. **Iterate** based on conversion data

---

**Last Updated**: 2026-03-22
