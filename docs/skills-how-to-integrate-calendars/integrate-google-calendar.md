---
name: integrate-google-calendar
description: >-
  Integrate Google Calendar access in a web app using OAuth 2.0 (authorization code)
  and the Google Calendar API v3. Use when implementing or debugging Google Calendar
  connectivity, or when comparing with this repository’s pattern.
---

# Integrate Google Calendar (OAuth + Calendar API)

## What you are building

A flow where the user signs in with Google, grants access to calendar list and events, your backend exchanges the authorization code for tokens, and your server calls the Calendar API to list calendars and fetch busy times.

## General approach

1. **Google Cloud Console**
   - Create a project (or use an existing one).
   - Enable **Google Calendar API**.
   - Create **OAuth 2.0 Client ID** credentials of type **Web application**.
   - Add authorized **JavaScript origins** and **redirect URIs** that match your app (e.g. `https://yourdomain.com` and `https://yourdomain.com/auth` if you use `/auth` as the OAuth callback route).

2. **OAuth scopes**

   Typical scopes:

   - `https://www.googleapis.com/auth/calendar.calendarlist.readonly`
   - `https://www.googleapis.com/auth/calendar.events`

   Often combined with OpenID-style scopes for identity: `openid`, `email`, `profile`.

3. **Browser: authorization request**

   - Endpoint: `https://accounts.google.com/o/oauth2/v2/auth`
   - Parameters: `client_id`, `redirect_uri`, `response_type=code`, `scope`, `access_type=offline` (so you can obtain a refresh token), `state` (JSON-encoded app state), optional `prompt` (e.g. `consent`, `select_account`).

4. **Backend: token exchange**

   - Endpoint: `https://oauth2.googleapis.com/token`
   - `grant_type=authorization_code`, same `client_id`, `client_secret`, `code`, `redirect_uri` (must match the one used in the browser exactly), `scope`.

5. **API usage**

   - Calendar list: `GET https://www.googleapis.com/calendar/v3/users/me/calendarList`
   - Events: `GET https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events` with `timeMin`, `timeMax`, `singleEvents=true`, etc.
   - Send `Authorization: Bearer <access_token>`.

6. **Token refresh**

   - When the access token expires, `POST` to the same token URL with `grant_type=refresh_token`, `refresh_token`, `client_id`, `client_secret`.

---

## How this repository does it (Timeful / `schej.it`)

### Frontend: OAuth URL and scopes

File: `frontend/src/utils/sign_in_utils.js`

- Builds the Google authorize URL with a **hardcoded web client ID** (`*.apps.googleusercontent.com`).
- Redirect URI: `` `${window.location.origin}/auth` ``.
- Puts `calendarType: "google"` (via `calendarTypes.GOOGLE`) inside the `state` query param so the `/auth` callback knows which provider completed.
- When calendar permission is requested, appends scopes for calendar list + events (see `signInGoogle` and `requestCalendarPermission`).

### Backend: exchanging the code for tokens

File: `server/services/auth/auth.go`

- `GetTokensFromAuthCode` posts to `https://oauth2.googleapis.com/token`.
- Uses **`CLIENT_ID` and `CLIENT_SECRET`** from the environment (not the frontend file—the server secret must stay server-side).
- `redirect_uri` is `{origin}/auth` where `origin` comes from the request context (`utils.GetOrigin(c)`).

### Linking the calendar account

File: `server/routes/user.go`

- Route: **`POST /user/add-google-calendar-account`**
- Handler calls `auth.GetTokensFromAuthCode` with `models.GoogleCalendarType`, then stores the resulting OAuth tokens on the user’s calendar account record.

### Reading calendars and events

File: `server/services/calendar/google_calendar.go`

- Implements `GetCalendarList` and `GetCalendarEvents` against the Calendar API v3 URLs above.

### Local / deployment configuration

File: `server/.env.template`

- Documents `CLIENT_ID`, `CLIENT_SECRET`, and the calendar-related scopes to configure in Google Cloud.

### Checklist when something breaks

- **Redirect URI mismatch**: browser `redirect_uri` and server token exchange must be identical (including scheme, host, path `/auth`).
- **Client ID mismatch**: the OAuth client used in the frontend must be the same **web** client whose secret you set in `CLIENT_SECRET` (same Google Cloud OAuth client).
- **Refresh token missing**: ensure `access_type=offline` and appropriate `prompt` so Google returns a refresh token when needed.
