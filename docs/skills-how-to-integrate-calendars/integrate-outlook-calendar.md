---
name: integrate-outlook-calendar
description: >-
  Integrate Microsoft Outlook / Microsoft 365 calendars using OAuth 2.0 (Azure AD
  v2) and Microsoft Graph Calendar APIs. Use when implementing Outlook calendar read
  access or when comparing with this repository’s pattern.
---

# Integrate Outlook Calendar (Microsoft identity + Graph)

## What you are building

Users sign in with Microsoft, grant read access to their profile and calendars, your backend exchanges the authorization code for tokens, and your server uses **Microsoft Graph** (`graph.microsoft.com`) to list calendars and query events in a time range.

## General approach

1. **Azure Portal (Microsoft Entra ID)**

   - Register an application.
   - Add a **platform**: Web, with **Redirect URI** matching your app (e.g. `https://yourdomain.com/auth`).
   - Create a **client secret** (for server-side token exchange).
   - Under **API permissions**, add Microsoft Graph delegated permissions such as:
     - `User.Read` (profile / email)
     - `Calendars.Read` (read calendars and events)
   - Optional: `offline_access` so refresh tokens can be issued (requested in the OAuth scope string).

2. **Authority / tenant**

   - Common pattern for multi-tenant consumer + work accounts: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize` and matching token endpoint `.../common/oauth2/v2.0/token`.

3. **Browser: authorization request**

   - Endpoint: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize`
   - Parameters: `client_id`, `response_type=code`, `redirect_uri`, `response_mode=query` (or form_post, depending on your app), `scope` (space-separated), `state`.

   Example scope string pieces: `offline_access`, `User.Read`, `Calendars.Read`.

4. **Backend: token exchange**

   - Endpoint: `https://login.microsoftonline.com/common/oauth2/v2.0/token`
   - `grant_type=authorization_code`, `client_id`, `client_secret`, `code`, `redirect_uri`, `scope` (often required to match the authorize request).

5. **Microsoft Graph**

   - List calendars: `GET https://graph.microsoft.com/v1.0/me/calendars`
   - Events in range: `GET https://graph.microsoft.com/v1.0/me/calendars/{id}/calendarView?startDateTime=...&endDateTime=...` (or equivalent query your app uses).

6. **Token refresh**

   - Same token endpoint with `grant_type=refresh_token` and the stored refresh token.

---

## How this repository does it (Timeful / `schej.it`)

### Frontend: OAuth URL and scopes

File: `frontend/src/utils/sign_in_utils.js` (`signInOutlook`)

- Uses a **hardcoded Azure application (client) ID** in the authorize URL.
- `tenant` is set to `common` (multi-tenant sign-in).
- Redirect URI: `` `${window.location.origin}/auth` `` (URL-encoded in the query).
- Base scopes: `offline_access User.Read`; with calendar permission, adds `Calendars.Read`.
- Stores `calendarType: "outlook"` and the encoded scope in `state` for the `/auth` callback.

### Backend: exchanging the code for tokens

File: `server/services/auth/auth.go`

- For `models.OutlookCalendarType`, credentials come from **`MICROSOFT_CLIENT_ID` and `MICROSOFT_CLIENT_SECRET`**.
- Token endpoint: `https://login.microsoftonline.com/common/oauth2/v2.0/token`.

> **Note:** This repo’s `server/.env.template` documents Google variables but **does not** list `MICROSOFT_*`; the code still requires them for Outlook—add them to your deployment secrets.

### User info after sign-in

File: `server/services/microsoftgraph/microsoftgraph.go`

- Uses Graph to read the signed-in user (e.g. `GET https://graph.microsoft.com/v1.0/me?$select=givenName,surname,mail`).

### Linking the calendar account

File: `server/routes/user.go`

- Route: **`POST /user/add-outlook-calendar-account`**
- Exchanges the code, fetches user info, stores OAuth tokens on the user’s calendar account with type Outlook.

### Reading calendars and events

File: `server/services/calendar/outlook_calendar.go`

- `GetCalendarList`: `GET https://graph.microsoft.com/v1.0/me/calendars?$select=id,name`
- `GetCalendarEvents`: calendar view query on `.../me/calendars/{id}/calendarview` with `startdatetime` / `enddatetime` and selected fields.

### Checklist when something breaks

- **Redirect URI** in Azure must exactly match what the app sends (including `/auth` and no trailing slash mismatch).
- **Client secret** expiry: rotate in Azure and update `MICROSOFT_CLIENT_SECRET`.
- **Admin consent**: some tenants require admin approval for Graph permissions—verify in Azure **Enterprise applications** / **API permissions**.
