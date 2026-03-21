# Testing Agent Calendar Access

## Setup Verification

Your agent is now configured to access **user_tommy**'s Google Calendar.

## Test Queries

Go to **http://localhost:3000** and try these in the chat:

### 1. Check Your Own Schedule

**Try**: "When am I free tomorrow?"

**What should happen**:
- Agent calls `getSchedule` with `userId: "user_tommy"`
- Fetches your real Google Calendar events
- Shows your actual free times

**Debug**: If this fails, check:
- Calendar is connected at `/test-calendar`
- User ID in Firestore is `user_tommy`
- Calendar account document exists at `users/user_tommy/calendarAccounts/`

---

### 2. Check Specific Date Range

**Try**: "What's on my calendar next week?"

**What should happen**:
- Agent fetches events from next Monday to Friday
- Lists your actual meetings/events
- Summarizes your busy times

---

### 3. Find Your Free Time

**Try**: "I need 2 hours free on Friday"

**What should happen**:
- Agent checks Friday's schedule
- Finds 2+ hour free blocks
- Suggests specific times

---

### 4. Multi-User Scheduling (with mock users for now)

**Try**: "Find time to meet with Alice next week"

**What should happen**:
- Agent queries your calendar (`user_tommy`)
- Uses mock data for Alice (`u1`)
- Finds overlapping free slots

**Note**: For real multi-user scheduling, you need to:
1. Add other users to Firestore as `users/user_alice/`
2. Connect their Google Calendars
3. Update the mock user IDs in `getFriends` tool

---

## Debugging

### If agent says "No calendar connected"

Check in Firebase Console:
```
Firestore → users → user_tommy → calendarAccounts
```

Should see a document with:
- `provider: "google"`
- `isActive: true`
- `accessToken: <encrypted>`
- `refreshToken: <encrypted>`

### If agent uses wrong user ID

Check the system prompt includes:
```
The logged-in user's ID is: user_tommy
```

### If agent can't find events

1. Verify you have events in Google Calendar
2. Check date range matches
3. Look for errors in browser console (F12)
4. Check server logs for API errors

---

## Expected Flow

```
User: "When am I free tomorrow?"
  ↓
Agent calls: getSchedule("user_tommy", "2026-03-25", "2026-03-25")
  ↓
Backend fetches Google Calendar events
  ↓
Agent receives: { events: [...], busyBlocks: [...] }
  ↓
Agent responds: "You're free from 2-5 PM tomorrow!"
```

---

## Current Limitations

1. **Single User**: Only `user_tommy` has real calendar data
2. **Mock Friends**: Alice, Bob, Carmen, David use fake data
3. **No Multi-Calendar**: Only queries `primary` Google Calendar
4. **Working Hours**: Assumes 9 AM - 5 PM working hours

---

## Next Steps

To enable real multi-user scheduling:

1. **Create test users in Firestore**:
   ```
   users/user_alice/
   users/user_bob/
   ```

2. **Connect their calendars** via `/test-calendar`

3. **Update scheduling participants** to use real user IDs

4. **Test overlap finding** with real calendar data from multiple users
