# Calendar Integration Plan

This document outlines the complete plan for integrating Google Calendar, Apple Calendar (iCloud), and Outlook Calendar into the When2Meet app.

## Overview

The calendar integration will allow users to:
1. Connect their calendar accounts (Google, Apple iCloud, or Outlook)
2. Automatically sync their busy/free times
3. Have availability populated in events they're invited to
4. Keep calendar data up-to-date with refresh tokens

## Architecture

### High-Level Flow

```
User clicks "Connect Calendar"
  ↓
Frontend redirects to OAuth provider (or shows credentials form for Apple)
  ↓
User grants permissions
  ↓
Provider redirects back to /auth callback
  ↓
Backend exchanges code for tokens
  ↓
Store encrypted tokens in Firestore
  ↓
Fetch calendar events and update availability
```

## Data Model Changes

### New Collection: `users/{userId}/calendarAccounts/{accountId}`

Store calendar account tokens separately from user profile for security.

```typescript
{
  provider: "google" | "apple" | "outlook",
  email: string,              // Calendar account email
  isActive: boolean,          // Can be disabled without deleting

  // OAuth tokens (Google, Outlook)
  accessToken?: string,       // Encrypted
  refreshToken?: string,      // Encrypted
  tokenExpiresAt?: timestamp,

  // Apple CalDAV credentials
  applePassword?: string,     // Encrypted app-specific password

  // Metadata
  connectedAt: timestamp,
  lastSyncedAt: timestamp,
  syncStatus: "active" | "error" | "expired",
  syncError?: string,         // Last error message if any

  createdAt: timestamp,
  updatedAt: timestamp
}
```

### New Collection: `users/{userId}/calendarEvents/{eventId}`

Cache of calendar events to minimize API calls.

```typescript
{
  accountId: string,          // Which calendar account this is from
  calendarId: string,         // Provider's calendar ID
  calendarName: string,       // e.g., "Work Calendar"

  title: string,
  start: string,              // ISO datetime
  end: string,
  isAllDay: boolean,

  // Metadata
  syncedAt: timestamp,
  expiresAt: timestamp,       // When to re-fetch (24 hours)
}
```

### Update: `users/{userId}`

Add calendar summary fields:

```typescript
{
  // ... existing fields ...

  // New fields
  calendarConnected: boolean,     // Already exists
  connectedCalendars: string[],   // ["google", "outlook"] - for quick lookup
  lastCalendarSync: timestamp,
}
```

## Environment Variables

Add to `.env`:

```bash
# Google Calendar OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Microsoft OAuth
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret

# Encryption for sensitive data
ENCRYPTION_KEY=32-character-random-string

# OAuth Redirect URI (for development)
OAUTH_REDIRECT_URI=http://localhost:3000/auth
```

## API Routes to Build

### 1. Calendar Connection Routes

#### `POST /api/calendar/google/connect`
- Input: `{ code: string }` (OAuth authorization code)
- Exchange code for tokens
- Store encrypted tokens in `calendarAccounts`
- Return success

#### `POST /api/calendar/apple/connect`
- Input: `{ email: string, password: string }` (app-specific password)
- Validate CalDAV connection
- Store encrypted credentials in `calendarAccounts`
- Return success

#### `POST /api/calendar/outlook/connect`
- Input: `{ code: string }` (OAuth authorization code)
- Exchange code for tokens
- Store encrypted tokens in `calendarAccounts`
- Return success

#### `GET /api/calendar/accounts`
- List all connected calendar accounts for current user
- Return: `{ accounts: CalendarAccount[] }`

#### `DELETE /api/calendar/accounts/{accountId}`
- Disconnect a calendar account
- Clean up associated events

### 2. OAuth Helper Routes

#### `GET /api/calendar/google/auth-url`
- Generate Google OAuth URL with correct scopes
- Return: `{ url: string }`

#### `GET /api/calendar/outlook/auth-url`
- Generate Microsoft OAuth URL
- Return: `{ url: string }`

### 3. Calendar Sync Routes

#### `POST /api/calendar/sync`
- Manually trigger calendar sync for all connected accounts
- Fetch events from all providers
- Update `calendarEvents` and `availability` in active events
- Return: `{ synced: number, errors: string[] }`

#### `POST /api/calendar/sync/{accountId}`
- Sync a specific calendar account
- Return: `{ events: number, synced: timestamp }`

### 4. Availability Routes (Update Existing)

#### `POST /api/events/{eventId}/availability/sync`
- New route to sync availability for all participants
- For each participant with calendar connected:
  - Fetch their calendar events in the event date range
  - Calculate busy blocks
  - Update their availability in the event
- Return: `{ synced: number, participants: string[] }`

## Implementation Phases

### Phase 1: Google Calendar (Simplest OAuth Flow)
**Why first:** Most common provider, standard OAuth 2.0

1. Set up Google Cloud project and OAuth credentials
2. Create encryption utilities (`lib/encryption.ts`)
3. Build OAuth helper functions (`lib/calendar/google.ts`)
4. Implement connect/disconnect API routes
5. Build frontend OAuth flow
6. Test complete flow

**Files to create:**
- `lib/encryption.ts` - Encrypt/decrypt utilities
- `lib/calendar/google.ts` - Google Calendar API wrapper
- `app/api/calendar/google/auth-url/route.ts`
- `app/api/calendar/google/connect/route.ts`
- `app/api/calendar/accounts/route.ts`

### Phase 2: Outlook Calendar (Similar OAuth)
**Why second:** Similar OAuth flow to Google

1. Set up Azure AD app registration
2. Build Outlook Graph API wrapper (`lib/calendar/outlook.ts`)
3. Implement connect routes
4. Test flow

**Files to create:**
- `lib/calendar/outlook.ts` - Microsoft Graph API wrapper
- `app/api/calendar/outlook/auth-url/route.ts`
- `app/api/calendar/outlook/connect/route.ts`

### Phase 3: Apple Calendar (Different Auth)
**Why last:** Uses CalDAV, not OAuth, more complex

1. Build CalDAV client wrapper (`lib/calendar/apple.ts`)
2. Implement credential-based connection
3. Test CalDAV queries

**Files to create:**
- `lib/calendar/apple.ts` - CalDAV wrapper
- `app/api/calendar/apple/connect/route.ts`

### Phase 4: Sync & Availability
1. Build calendar event sync logic
2. Implement busy/free calculation
3. Wire up to event availability
4. Add background refresh (optional)

**Files to create:**
- `lib/calendar/sync.ts` - Sync orchestration
- `lib/calendar/availability.ts` - Calculate busy/free
- `app/api/calendar/sync/route.ts`
- `app/api/events/[eventId]/availability/sync/route.ts`

## Security Considerations

### Token Storage
- **All tokens and passwords MUST be encrypted** using AES-256-GCM
- Use environment variable `ENCRYPTION_KEY` (32 characters)
- Never log tokens or passwords
- Use `json:"-"` in TypeScript types for sensitive fields

### Encryption Implementation
```typescript
// lib/encryption.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

export function encrypt(text: string): string {
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'utf-8');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

export function decrypt(encryptedText: string): string {
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'utf-8');
  const parts = encryptedText.split(':');

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

### OAuth Security
- Always use `state` parameter to prevent CSRF
- Use HTTPS in production (redirect URIs)
- Validate redirect URI matches exactly
- Request minimal scopes (read-only)
- Handle token refresh gracefully

### CalDAV Security (Apple)
- Treat app-specific password like a full password
- Never log password
- Show clear UI warning about trust level
- Allow users to revoke easily

## Calendar Scopes & Permissions

### Google Calendar
```
https://www.googleapis.com/auth/calendar.calendarlist.readonly
https://www.googleapis.com/auth/calendar.events
```

### Microsoft Graph (Outlook)
```
offline_access
User.Read
Calendars.Read
```

### Apple iCloud
- No scopes - full CalDAV access with app-specific password
- User must generate password at https://appleid.apple.com

## Error Handling

### Token Expiration
- Detect expired tokens (401/403 responses)
- Attempt refresh token flow
- If refresh fails, mark account as `syncStatus: "expired"`
- Notify user to reconnect

### Sync Errors
- Store last error in `calendarAccounts.syncError`
- Set `syncStatus: "error"`
- Retry with exponential backoff
- Surface errors in UI

### Rate Limiting
- Google: 1,000,000 requests/day (plenty for our use)
- Outlook: Throttling at tenant level
- Apple: No documented limits, but be respectful

## Frontend Components Needed

1. **CalendarConnectionButton** - Shows "Connect Google/Outlook/Apple"
2. **ConnectedCalendarsPanel** - Lists connected calendars, allows disconnect
3. **CalendarSyncStatus** - Shows last sync time, errors
4. **OAuthCallback** - `/auth` route that handles OAuth redirects
5. **AppleCredentialsModal** - Collects Apple ID + app-specific password

## Testing Plan

### Unit Tests
- Encryption/decryption
- Token refresh logic
- Availability calculation

### Integration Tests
- OAuth flow end-to-end (use test accounts)
- Calendar event fetching
- Availability sync

### Manual Testing
- Connect each provider
- Disconnect and reconnect
- Force token expiration
- Test with multiple calendars
- Test with all-day events
- Test with recurring events (scope for later?)

## Dependencies to Add

```json
{
  "dependencies": {
    "googleapis": "^128.0.0",          // Google Calendar API
    "@microsoft/microsoft-graph-client": "^3.0.7",  // MS Graph
    "node-fetch": "^3.3.2",             // For CalDAV requests
    "ical.js": "^1.5.0"                 // Parse iCal for Apple
  }
}
```

## Future Enhancements (Out of Scope for MVP)

- Background sync with Cloud Functions/scheduled jobs
- Support for multiple calendars per provider
- Calendar write access (create events)
- Recurring event support
- Webhook notifications for real-time sync
- Calendar conflict detection
- Smart suggestions based on calendar patterns

## Success Metrics

- Users can connect Google Calendar in <60 seconds
- 95%+ success rate on OAuth flows
- Calendar sync completes in <5 seconds
- Zero token/password leaks
- Clear error messages when sync fails

## Resources

- Google Calendar API: https://developers.google.com/calendar/api/v3/reference
- Microsoft Graph: https://learn.microsoft.com/en-us/graph/api/calendar-list-events
- Apple CalDAV: https://developer.apple.com/library/archive/documentation/DataManagement/Conceptual/EventKitProgGuide/
- OAuth 2.0 Spec: https://oauth.net/2/
