# LLM to Calendar Integration Audit

## Summary

The When2Meet Agent's LLM-to-calendar integration has **most core components implemented**, but the connection flow is **not fully wired up**. The agent can theoretically access Google Calendar data, but there are configuration and integration gaps preventing it from working properly.

---

## What's Working ✅

### 1. Backend Infrastructure (Complete)
- **Calendar utilities** (`lib/calendar-utils.ts`):
  - `eventsToBusyBlocks()` - Converts events to time blocks ✅
  - `mergeBusyBlocks()` - Consolidates overlapping blocks ✅
  - `calculateFreeWindows()` - Finds free time with quality scores ✅
  - `findCommonFreeSlots()` - Finds overlapping availability ✅
  - All math logic is solid and deterministic

- **OAuth & Token Management**:
  - Google OAuth flow implemented ✅
  - Token encryption/decryption in place ✅
  - Automatic token refresh logic ✅
  - Firestore storage for tokens ✅

- **API Endpoints**:
  - `POST /api/calendar/availability` - Standalone endpoint (working) ✅
  - Google Calendar events API - Working ✅

### 2. Agent Tools (Defined but Not Connecting)
- **`getSchedule` tool** - Defined in `app/api/chat/route.ts:125-263` ⚠️
  - Fetches user's Google Calendar events
  - Converts to busy blocks
  - Returns event summaries
  - **Issue**: Tool exists but agent may not be calling it correctly

- **`findOverlap` tool** - Defined in `app/api/chat/route.ts:265-413` ⚠️
  - Finds common free slots between multiple users
  - Uses real Google Calendar data
  - Returns top 5 suggested slots
  - **Issue**: Requires `schedulingParticipants` to be populated

- **`suggestTimes` tool** - Defined in `app/api/chat/route.ts:84-105` ✅
  - Shows suggested meeting times in UI
  - Properly renders as TimeChip components
  - Frontend extraction logic working (`app/page.tsx:103-109`)

### 3. UI Components (Complete)
- **TimeChip** - Renders suggested times ✅
- **SchedulingParticipantsBar** - Shows meeting attendees ✅
- **Chat message rendering** - Displays agent responses ✅
- **Tool result extraction** - Pulls `suggestedTimes` from tool results ✅

---

## What's Missing / Not Connected ❌

### 1. **Agent Not Invoking Calendar Tools Properly**

**Problem**: The LLM agent has access to `getSchedule` and `findOverlap` tools, but there's no evidence in the codebase that the agent is successfully calling these tools and receiving real calendar data.

**Why This Matters**:
- User asks: "When am I free tomorrow?"
- Agent should call: `getSchedule(userId: "user_phil", startDate: "2026-03-22", endDate: "2026-03-22")`
- Agent should receive: Real calendar events and busy blocks
- **Current behavior**: Unknown - likely using mock/fallback data

**Evidence**:
- System prompt tells agent to use tools (`app/api/chat/route.ts:67-79`)
- Tools are defined with proper schemas
- **BUT**: No console logs, no test coverage showing successful tool calls
- Documentation says "it's not connecting properly" (user's complaint)

---

### 2. **User ID Confusion: `user_tommy` vs `user_phil`**

**Problem**: Hardcoded user IDs are inconsistent across files.

**Where This Appears**:
```typescript
// app/api/chat/route.ts:39
const currentUserId = sessionUserId || body.currentUserId || "user_phil";

// app/test-calendar/page.tsx:19
<GoogleCalendarConnect userId="user_phil" />

// docs/testing-agent-calendar.md:5
Your agent is configured to access **user_tommy**'s Google Calendar.

// docs/calendar-agent-integration.md:81
userId: "user_tommy"
```

**Impact**:
- Documentation says `user_tommy` has calendar connected
- Code defaults to `user_phil`
- Agent may be querying wrong user ID
- **This could cause "no calendar found" errors**

---

### 3. **Scheduling Participants Flow Not Clear**

**Problem**: The `findOverlap` tool depends on `schedulingParticipants`, but it's unclear how users select participants before the agent can find overlap.

**Current Flow**:
1. User adds participants via `/addnetwork` → `SchedulingParticipantsBar`
2. Participants stored in localStorage (`lib/scheduling-storage.ts`)
3. Sent to chat API via `prepareSendMessagesRequest` (`app/page.tsx:273`)
4. Agent receives them in system prompt (`app/api/chat/route.ts:49-63`)

**Missing Piece**:
- If `schedulingParticipants` is empty, `findOverlap` returns error:
  ```typescript
  "No participants selected. The user should choose people from their network"
  ```
- **Documentation doesn't explain this prerequisite step**
- Users might try "Schedule with Alice" without adding Alice first

---

### 4. **Agent Model is `gemini-3-flash-preview` (Google via AI SDK; not Anthropic by default)**

**Problem**: The chat API uses Google's Gemini model instead of Anthropic's Claude:

```typescript
// app/api/chat/route.ts:65
model: google("gemini-3-flash-preview")
```

**Implications**:
- Documentation assumes Claude-based reasoning
- Gemini's tool calling behavior might differ
- Prompt engineering may need adjustment for Gemini
- **This could explain why tools aren't being called as expected**

---

### 5. **No End-to-End Test Flow in Docs**

**Problem**: `docs/testing-agent-calendar.md` lists test queries, but doesn't show:
- Expected console output
- Screenshots of successful tool calls
- Step-by-step verification checklist
- Example of agent actually receiving calendar data

**What's Missing**:
```
✅ User connected calendar at /test-calendar
✅ Firestore shows encrypted tokens
✅ User asks "When am I free tomorrow?"
❓ Agent calls getSchedule tool - NO PROOF
❓ Agent receives events JSON - NO PROOF
❓ Agent responds with real free times - NO PROOF
```

---

### 6. **API Endpoint Mismatch**

**Problem**: There's a standalone `/api/calendar/availability` endpoint that replicates the `findOverlap` tool logic, but it's **never used** by the agent.

**Current State**:
- `POST /api/calendar/availability` - Full implementation (unused)
- `findOverlap` tool in chat route - Duplicates same logic
- **Redundant code** - Should consolidate

**Better Approach**:
```typescript
// findOverlap tool should call the availability API:
execute: async ({ userIds, startDate, endDate, durationMinutes }) => {
  const response = await fetch('/api/calendar/availability', {
    method: 'POST',
    body: JSON.stringify({ userIds, startDate, endDate, minDuration: durationMinutes })
  });
  return response.json();
}
```

This would:
- Reduce code duplication
- Make testing easier (can test API independently)
- Improve maintainability

---

## Critical Missing Connection

### **The Core Issue: Tool Invocation Chain Not Proven**

Here's what should happen:

```
┌─────────────────────────────────────────────────────────┐
│ 1. User: "When am I free tomorrow?"                      │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Agent (Gemini) decides to call getSchedule tool      │
│    Input: { userId: "user_phil", startDate: "2026-03-22" }│
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Backend fetches from Google Calendar API             │
│    - Decrypt tokens                                      │
│    - Call calendar.events.list()                         │
│    - Convert to busy blocks                              │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Tool returns:                                         │
│    {                                                     │
│      events: [...],                                      │
│      busyBlocks: [{ start: "...", end: "..." }],         │
│      totalEvents: 5                                      │
│    }                                                     │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Agent receives data and generates response:          │
│    "You're free from 2-5 PM tomorrow!"                   │
└─────────────────────────────────────────────────────────┘
```

**Current Status**: Steps 3-5 are **unverified**. We don't know if:
- Gemini is calling the tools
- Tool results are being returned correctly
- Agent is interpreting the results

---

## What Needs to Be Done

### Immediate Actions

1. **Fix User ID Consistency** 🔴 HIGH PRIORITY
   - Decide on `user_tommy` OR `user_phil` (not both)
   - Update all hardcoded references
   - Use session-based user ID consistently

2. **Add Debug Logging to Tool Calls** 🔴 HIGH PRIORITY
   ```typescript
   // In app/api/chat/route.ts - getSchedule tool
   execute: async ({ userId, startDate, endDate }) => {
     console.log("🔧 [TOOL CALL] getSchedule invoked");
     console.log("   userId:", userId);
     console.log("   dateRange:", startDate, "to", endDate);

     const result = { /* ... fetch calendar data ... */ };

     console.log("✅ [TOOL RESULT] getSchedule returned", result.events.length, "events");
     return result;
   }
   ```

3. **Test Tool Invocation End-to-End** 🔴 HIGH PRIORITY
   - Connect calendar for test user
   - Send message: "When am I free tomorrow?"
   - Check console for tool call logs
   - Verify agent receives real calendar data
   - Document the working flow

4. **Consolidate Availability Logic** 🟡 MEDIUM PRIORITY
   - Make `findOverlap` tool call `/api/calendar/availability`
   - Remove duplicate code in chat route
   - Single source of truth for overlap finding

5. **Update Documentation** 🟡 MEDIUM PRIORITY
   - Add prerequisite: "Must add participants first"
   - Show actual console output from successful tool calls
   - Include troubleshooting section for common failures
   - Document Gemini-specific prompt patterns

6. **Fix Mock User Fallback** 🟢 LOW PRIORITY
   ```typescript
   // app/api/chat/route.ts:110-123
   // Currently returns mock users if no schedulingParticipants
   // Should instead prompt user to add network
   execute: async () => {
     if (schedulingParticipants.length === 0) {
       return {
         error: "Please add participants using the 'Add network' button first",
         suggestion: "Click 'Add network' to choose who you want to meet with"
       };
     }
     return schedulingParticipants;
   }
   ```

---

## Testing Checklist

Use this to verify the integration is working:

```
# Setup
□ Calendar connected for test user at /test-calendar
□ Firestore has calendarAccounts document with encrypted tokens
□ User ID in session matches user ID in Firestore
□ Test user has ≥3 events in Google Calendar for next 7 days

# Tool: getSchedule
□ Send: "What's on my calendar tomorrow?"
□ Console shows: "🔧 [TOOL CALL] getSchedule invoked"
□ Console shows: "✅ [TOOL RESULT] getSchedule returned N events"
□ Agent response mentions actual event times (not mock data)

# Tool: findOverlap
□ Add 2+ participants via /addnetwork
□ SchedulingParticipantsBar shows participants
□ Send: "Find time to meet with [participant names]"
□ Console shows: "🔧 [TOOL CALL] findOverlap invoked"
□ Console shows: "✅ [TOOL RESULT] findOverlap returned N slots"
□ Agent calls suggestTimes with actual available slots

# Tool: suggestTimes
□ TimeChip components render in UI
□ Clicking a time chip shows "Create calendar invite" bubble
□ Slots match real availability (not mock SAMPLE_TIME_SLOTS)

# Error Handling
□ Try with no calendar connected → graceful error
□ Try with no participants selected → helpful prompt
□ Try with expired token → auto-refresh works
```

---

## Updated Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│  User Chat Interface (app/page.tsx)                      │
│  - Sends message via useChat hook                        │
│  - Passes schedulingParticipants + currentUserId         │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  Chat API Route (app/api/chat/route.ts)                 │
│  - Model: gemini-3-flash-preview (env: GEMINI_MODEL)     │
│  - Tools: getSchedule, findOverlap, suggestTimes         │
└────────────────┬────────────────────────────────────────┘
                 │
    ┌────────────┴────────────┬───────────────────┐
    ▼                         ▼                   ▼
┌─────────┐            ┌──────────────┐    ┌──────────────┐
│getSchedule│          │findOverlap   │    │suggestTimes  │
│  tool    │          │  tool        │    │  tool        │
└────┬─────┘          └──────┬───────┘    └──────┬───────┘
     │                       │                   │
     ▼                       ▼                   │
┌──────────────────────────────────────┐         │
│  Google Calendar API                  │         │
│  - Fetch events via googleapis        │         │
│  - Decrypt OAuth tokens               │         │
│  - Transform to busy blocks           │         │
└──────────────┬───────────────────────┘         │
               │                                  │
               ▼                                  │
┌──────────────────────────────────────┐         │
│  Calendar Utils (lib/calendar-utils.ts)│       │
│  - eventsToBusyBlocks()               │        │
│  - calculateFreeWindows()             │        │
│  - findCommonFreeSlots()              │        │
└──────────────┬───────────────────────┘         │
               │                                  │
               └──────────────┬───────────────────┘
                              ▼
               ┌─────────────────────────────────┐
               │  Tool Result to Agent            │
               │  { suggestedSlots: [...] }       │
               └──────────────┬──────────────────┘
                              ▼
               ┌─────────────────────────────────┐
               │  Agent Response to User          │
               │  "You're free 2-5 PM tomorrow!"  │
               │  + suggestTimes tool call        │
               └──────────────┬──────────────────┘
                              ▼
               ┌─────────────────────────────────┐
               │  UI Renders TimeChips            │
               │  <TimeChip time="2:00 PM" />     │
               └──────────────────────────────────┘
```

**Red Arrow (Missing)**: The flow from "Tool Result" → "Agent Response" is **not verified to be working**.

---

## Summary of Gaps

| Component | Status | Issue |
|-----------|--------|-------|
| Calendar Utils | ✅ Working | None |
| OAuth & Tokens | ✅ Working | None |
| API Endpoints | ✅ Working | Unused `/api/calendar/availability` |
| Tool Definitions | ⚠️ Defined | Not proven to be called by agent |
| User ID Management | ❌ Broken | Inconsistent `user_tommy` vs `user_phil` |
| Scheduling Participants | ⚠️ Partial | Works but not documented as prerequisite |
| Agent Model | ⚠️ Wrong Model | Using Gemini instead of Claude |
| End-to-End Testing | ❌ Missing | No proof of working tool calls |
| Documentation | ⚠️ Incomplete | Doesn't show actual working flow |
| UI Components | ✅ Working | TimeChips render correctly |

---

## Recommended Fix Order

1. **Fix user ID** (`user_tommy` → `user_phil` everywhere)
2. **Add debug logs** to tool executions
3. **Test "When am I free tomorrow?"** query
4. **Verify tool calls** show up in console
5. **Test multi-user scheduling** with participants
6. **Document the working flow** with screenshots
7. **Consolidate availability API** (remove duplication)
8. **Consider switching to Claude** if Gemini tool calling is problematic

---

## Next Steps

To unblock the integration:

1. Run the app: `npm run dev`
2. Connect calendar at `/test-calendar` for `user_phil`
3. Open browser console
4. Send message: "What's on my calendar tomorrow?"
5. Check console for:
   - `[Chat API] Final currentUserId: user_phil`
   - `[getSchedule] Fetching calendar for userId: user_phil`
   - `[getSchedule] Fetched events from Google Calendar: N`
6. If no logs appear → **Agent is not calling the tool** → Gemini prompt issue
7. If logs appear but events empty → **Token/auth issue** → Check Firestore
8. If events returned but agent doesn't use them → **Model interpretation issue** → Adjust prompt

**The smoking gun will be in the console logs during a real chat interaction.**
