# Calendar Integration Quick Start

This guide will get you started implementing **Google Calendar** integration (Phase 1).

## Prerequisites

1. Google Cloud Console account
2. Firebase project already set up
3. Encryption key configured

## Step 1: Google Cloud Setup (5 minutes)

### Create OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project (or create one)
3. Navigate to **APIs & Services > Library**
4. Search for "Google Calendar API" and **Enable** it
5. Go to **APIs & Services > Credentials**
6. Click **Create Credentials > OAuth 2.0 Client ID**
7. Configure consent screen if prompted:
   - User Type: External
   - App name: "When2Meet"
   - User support email: your email
   - Developer email: your email
   - Scopes: Add these:
     - `https://www.googleapis.com/auth/calendar.calendarlist.readonly`
     - `https://www.googleapis.com/auth/calendar.events`
8. Create OAuth Client:
   - Application type: **Web application**
   - Name: "When2Meet Web"
   - Authorized JavaScript origins:
     - `http://localhost:3000` (for dev)
   - Authorized redirect URIs:
     - `http://localhost:3000/auth` (for dev)
9. Copy the **Client ID** and **Client Secret**

## Step 2: Environment Setup

Add to your `.env` file:

```bash
# Google Calendar OAuth
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here

# Encryption (generate a random 32-character string)
ENCRYPTION_KEY=your-32-character-random-string-here

# OAuth Redirect
OAUTH_REDIRECT_URI=http://localhost:3000/auth
```

Generate encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex').slice(0, 32))"
```

## Step 3: Install Dependencies

```bash
npm install googleapis
```

## Step 4: Create Type Definitions

Update `lib/types.ts`:

```typescript
// Add to existing types

/** Calendar account connection */
export type CalendarAccountDoc = {
  provider: "google" | "apple" | "outlook";
  email: string;
  isActive: boolean;

  // OAuth (Google, Outlook)
  accessToken?: string;      // Encrypted
  refreshToken?: string;     // Encrypted
  tokenExpiresAt?: FirestoreTimestamp;

  // Apple CalDAV
  applePassword?: string;    // Encrypted

  connectedAt: FirestoreTimestamp;
  lastSyncedAt: FirestoreTimestamp;
  syncStatus: "active" | "error" | "expired";
  syncError?: string;

  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
};

/** Cached calendar event */
export type CalendarEventDoc = {
  accountId: string;
  calendarId: string;
  calendarName: string;

  title: string;
  start: ISODateTime;
  end: ISODateTime;
  isAllDay: boolean;

  syncedAt: FirestoreTimestamp;
  expiresAt: FirestoreTimestamp;
};
```

## Step 5: Implementation Order

Follow this order to build incrementally:

### 5.1 Encryption Utilities (Required First)
Create `lib/encryption.ts` - see full implementation in [calendar-integration-plan.md](./calendar-integration-plan.md#encryption-implementation)

### 5.2 Google Calendar API Wrapper
Create `lib/calendar/google.ts`:

```typescript
import { google } from 'googleapis';
import { decrypt } from '../encryption';

export async function getGoogleCalendarClient(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.OAUTH_REDIRECT_URI
  );

  oauth2Client.setCredentials({ access_token: accessToken });
  return google.calendar({ version: 'v3', auth: oauth2Client });
}

export async function fetchGoogleCalendarEvents(
  accessToken: string,
  startDate: string,
  endDate: string
) {
  const calendar = await getGoogleCalendarClient(accessToken);

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: startDate,
    timeMax: endDate,
    singleEvents: true,
    orderBy: 'startTime',
  });

  return response.data.items || [];
}

export async function exchangeGoogleCodeForTokens(code: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.OAUTH_REDIRECT_URI
  );

  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}
```

### 5.3 Auth URL Route
Create `app/api/calendar/google/auth-url/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { google } from 'googleapis';

export async function GET() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.OAUTH_REDIRECT_URI
  );

  const scopes = [
    'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
    'https://www.googleapis.com/auth/calendar.events',
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // Force to get refresh token
  });

  return NextResponse.json({ url });
}
```

### 5.4 Connect Route
Create `app/api/calendar/google/connect/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { collection, timestamps, encrypt } from "@/lib/api-helpers";
import { exchangeGoogleCodeForTokens } from "@/lib/calendar/google";

export async function POST(request: NextRequest) {
  try {
    const { code, userId } = await request.json();

    if (!code || !userId) {
      return NextResponse.json(
        { error: "code and userId required" },
        { status: 400 }
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeGoogleCodeForTokens(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.json(
        { error: "Failed to get tokens" },
        { status: 500 }
      );
    }

    // Store encrypted in Firestore
    const accountData = {
      provider: "google",
      email: "", // TODO: Fetch from Google People API
      isActive: true,
      accessToken: encrypt(tokens.access_token),
      refreshToken: encrypt(tokens.refresh_token),
      tokenExpiresAt: tokens.expiry_date
        ? new Date(tokens.expiry_date)
        : null,
      connectedAt: timestamps().createdAt,
      lastSyncedAt: timestamps().createdAt,
      syncStatus: "active",
      ...timestamps(),
    };

    const accountRef = await collection("users")
      .doc(userId)
      .collection("calendarAccounts")
      .add(accountData);

    // Update user's calendarConnected flag
    await collection("users").doc(userId).update({
      calendarConnected: true,
      updatedAt: timestamps().updatedAt,
    });

    return NextResponse.json({
      success: true,
      accountId: accountRef.id,
    });
  } catch (error) {
    console.error("Error connecting Google calendar:", error);
    return NextResponse.json(
      { error: "Failed to connect calendar" },
      { status: 500 }
    );
  }
}
```

### 5.5 List Accounts Route
Create `app/api/calendar/accounts/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { collection } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId required" },
        { status: 400 }
      );
    }

    const snapshot = await collection("users")
      .doc(userId)
      .collection("calendarAccounts")
      .where("isActive", "==", true)
      .get();

    const accounts = snapshot.docs.map(doc => ({
      id: doc.id,
      provider: doc.data().provider,
      email: doc.data().email,
      connectedAt: doc.data().connectedAt,
      lastSyncedAt: doc.data().lastSyncedAt,
      syncStatus: doc.data().syncStatus,
    }));

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("Error fetching calendar accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500 }
    );
  }
}
```

## Step 6: Frontend Implementation

Create a simple test component:

```typescript
// components/GoogleCalendarConnect.tsx
'use client';

import { useState } from 'react';

export function GoogleCalendarConnect({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleConnect() {
    setLoading(true);

    try {
      // Get OAuth URL
      const res = await fetch('/api/calendar/google/auth-url');
      const { url } = await res.json();

      // Store userId in sessionStorage to use after redirect
      sessionStorage.setItem('connectingUserId', userId);

      // Redirect to Google
      window.location.href = url;
    } catch (error) {
      console.error('Failed to connect:', error);
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="px-4 py-2 bg-blue-500 text-white rounded"
    >
      {loading ? 'Connecting...' : 'Connect Google Calendar'}
    </button>
  );
}
```

Create OAuth callback page:

```typescript
// app/auth/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function AuthCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState('Connecting...');

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      setStatus('Error: ' + error);
      return;
    }

    if (!code) {
      setStatus('No authorization code received');
      return;
    }

    // Get userId from session
    const userId = sessionStorage.getItem('connectingUserId');
    if (!userId) {
      setStatus('No user ID found');
      return;
    }

    // Exchange code for tokens
    fetch('/api/calendar/google/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, userId }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStatus('Connected! Redirecting...');
          sessionStorage.removeItem('connectingUserId');
          setTimeout(() => router.push('/'), 2000);
        } else {
          setStatus('Error: ' + data.error);
        }
      })
      .catch(err => {
        setStatus('Error: ' + err.message);
      });
  }, [searchParams, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl mb-4">Calendar Connection</h1>
        <p>{status}</p>
      </div>
    </div>
  );
}
```

## Step 7: Test the Flow

1. Start your dev server: `npm run dev`
2. Navigate to a page with the `GoogleCalendarConnect` component
3. Click "Connect Google Calendar"
4. Sign in with Google and grant permissions
5. Should redirect to `/auth` then back to home
6. Check Firestore - you should see a new document in `users/{userId}/calendarAccounts`

## Step 8: Verify in Firebase Console

Go to Firebase Console > Firestore and check:
- `users/{userId}/calendarAccounts` - should have a document with encrypted tokens
- `users/{userId}` - should have `calendarConnected: true`

## Next Steps

Once Google Calendar is working:
1. Implement calendar event fetching
2. Build availability calculation
3. Add Outlook support (similar OAuth flow)
4. Add Apple support (CalDAV)

See [calendar-integration-plan.md](./calendar-integration-plan.md) for complete details.

## Troubleshooting

### "redirect_uri_mismatch" error
- Make sure the redirect URI in Google Cloud Console exactly matches `http://localhost:3000/auth`
- No trailing slash!
- Must match the `OAUTH_REDIRECT_URI` in your `.env`

### No refresh token returned
- Make sure you have `access_type: 'offline'` in the auth URL
- Use `prompt: 'consent'` to force showing consent screen
- First-time users should get a refresh token

### Encryption errors
- Make sure `ENCRYPTION_KEY` is exactly 32 characters
- Same key must be used to encrypt and decrypt

### Token doesn't work
- Check if token is expired (Google tokens expire in 1 hour)
- You'll need to implement token refresh (see Phase 4 in the plan)
