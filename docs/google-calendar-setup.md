# Google Calendar Integration Setup

## Overview

The When2Meet app integrates with Google Calendar to automatically detect busy times and suggest available meeting slots. Users can connect their Google Calendar via OAuth 2.0, and the app will sync their availability.

## Prerequisites

1. Google Cloud Project with Calendar API enabled
2. OAuth 2.0 Client credentials (Web application type)
3. Firebase project for user authentication

## Setup Steps

### 1. Google Cloud Console Setup

1. **Create or select a project** at [Google Cloud Console](https://console.cloud.google.com/)

2. **Enable Google Calendar API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

3. **Create OAuth 2.0 credentials**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Application type: "Web application"
   - Name: "When2Meet Calendar Integration"

4. **Configure authorized redirect URIs**:
   - Development: `http://localhost:3000/api/auth/google/callback`
   - Production: `https://yourdomain.com/api/auth/google/callback`

5. **Copy credentials**:
   - Copy the Client ID and Client Secret
   - Add them to your `.env` file

### 2. Environment Variables

Add these to your `.env` file:

```bash
# Google Calendar OAuth
GOOGLE_OAUTH_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret
```

### 3. OAuth Scopes

The app requests these scopes:
- `openid` - User identity
- `email` - User email
- `profile` - User profile info
- `https://www.googleapis.com/auth/calendar.readonly` - Read calendar metadata
- `https://www.googleapis.com/auth/calendar.events` - Read and write calendar events

## How It Works

### User Flow

1. User signs in with Firebase Auth (Google)
2. User navigates to Settings page
3. User clicks "Connect Calendar" button
4. Redirected to Google OAuth consent screen
5. User grants calendar permissions
6. Redirected back to app with authorization code
7. Backend exchanges code for access + refresh tokens
8. Tokens stored in user's Firestore document

### Token Management

- **Access Token**: Short-lived (1 hour), used for API calls
- **Refresh Token**: Long-lived, used to get new access tokens
- **Auto-refresh**: Tokens are automatically refreshed when expired

### API Endpoints

#### Connect Calendar
```
GET /api/auth/google?userId={userId}
```
Initiates OAuth flow for Google Calendar

#### OAuth Callback
```
GET /api/auth/google/callback?code={code}&state={state}
```
Handles OAuth callback and stores tokens

#### List Calendars
```
GET /api/calendar/google/calendars?userId={userId}
```
Returns list of user's calendars

#### Get Busy Times
```
GET /api/calendar/google/busy?userId={userId}&timeMin={ISO}&timeMax={ISO}&calendars={ids}
```
Returns busy times within specified range

#### Disconnect Calendar
```
POST /api/calendar/google/disconnect
Body: { userId: string }
```
Removes calendar connection

## Frontend Components

### GoogleCalendarConnect

Component for connecting/disconnecting Google Calendar:

```tsx
import { GoogleCalendarConnect } from "@/components/calendar/GoogleCalendarConnect";

<GoogleCalendarConnect
  onConnected={() => console.log("Connected!")}
  onDisconnected={() => console.log("Disconnected")}
/>
```

## Data Storage

Calendar connection data is stored in the user document:

```typescript
{
  googleCalendar: {
    connected: true,
    accessToken: "ya29...",
    refreshToken: "1//...",
    expiresAt: "2024-03-21T12:00:00.000Z",
    scope: "openid email profile ...",
    connectedAt: Timestamp
  },
  calendarConnected: true
}
```

## Security Considerations

1. **Client Secret**: Never expose in client-side code
2. **Token Storage**: Tokens stored securely in Firestore
3. **Refresh Tokens**: Automatically refresh expired access tokens
4. **Scopes**: Request minimum necessary permissions (read-only)
5. **State Parameter**: Prevents CSRF attacks in OAuth flow

## Troubleshooting

### "Redirect URI mismatch" error
- Ensure redirect URI in Google Console exactly matches the one used in the app
- Check for trailing slashes, http vs https, port numbers

### "Calendar not connected" error
- User needs to complete OAuth flow
- Check that tokens are stored in Firestore

### "Refresh token not available" error
- User needs to reconnect calendar
- Ensure `access_type=offline` and `prompt=consent` in OAuth URL

### API returns 401/403
- Access token may be expired - refresh automatically handles this
- Check that Calendar API is enabled in Google Cloud Console
- Verify OAuth scopes include calendar permissions

## Testing

1. Start dev server: `npm run dev`
2. Sign in with Google account
3. Go to Settings page
4. Click "Connect Calendar"
5. Grant permissions
6. Verify connection shows "Connected"
7. Test fetching calendars and busy times via API

## Production Deployment

1. Update authorized redirect URIs in Google Console with production URL
2. Set environment variables in production hosting (Vercel, etc.)
3. Ensure HTTPS is enabled
4. Test OAuth flow in production environment
