---
name: integrate-apple-calendar-icloud-caldav
description: >-
  Integrate Apple/iCloud calendars for server-side busy-time reads using CalDAV
  (not Sign in with Apple). Use when implementing iCloud calendar access via
  app-specific passwords or when comparing with this repository’s pattern.
---

# Integrate Apple Calendar (iCloud CalDAV + app-specific password)

## Important distinction

**Apple Calendar** in many products does **not** mean the native macOS/iOS **EventKit** SDK. For a **web or Linux backend** that must read iCloud calendars, the usual approach is:

- **CalDAV** at Apple’s iCloud CalDAV endpoint, with:
  - **Apple ID** (email), and
  - an **app-specific password** (generated in Apple ID settings),

not OAuth “Sign in with Apple” and not a public Calendar REST API in the same style as Google/Graph.

Local-only apps on Apple platforms may use **EventKit** instead; that is a different integration (device permissions, no iCloud password on your server).

## General approach (CalDAV)

1. **User creates an app-specific password**

   - Apple ID → Sign-In and Security → App-Specific Passwords (URL may vary; the app often links to `https://appleid.apple.com/account/manage`).

2. **Transport and auth**

   - Endpoint: **`https://caldav.icloud.com`**
   - Authentication: **HTTP Basic** with Apple ID as username and app-specific password as password.
   - Protocol: **WebDAV + CalDAV** (discover principal, calendar home, list calendars, query `VEVENT` in a time range).

3. **Typical server libraries**

   - Language-specific WebDAV/CalDAV clients (this repo uses Go: `go-webdav` / `caldav` plus `go-ical` for parsing).

4. **Security expectations**

   - You are handling a **password equivalent**. Store it **encrypted at rest**, never log it, use TLS for all requests, and be explicit in the UI that the user is trusting your backend with iCloud access.

---

## How this repository does it (Timeful / `schej.it`)

### Frontend: collect credentials (no OAuth redirect)

File: `frontend/src/components/calendar_permission_dialogs/AppleCredentials.vue`

- UI asks for **Apple ID** and **app-specific password** (labeled “App password”).
- Explains generating an app-specific password via Apple ID account management.
- On submit: **`POST /user/add-apple-calendar-account`** with JSON `{ email, password }`.
- States that credentials will be stored and encrypted (user-facing copy).

### Data model

File: `server/models/calendar.go`

- `AppleCalendarAuth` holds `Email` and `Password` (serialized with `json:"-"` on sensitive fields—still protect at rest with encryption).

### Backend route

File: `server/routes/user.go`

- Route: **`POST /user/add-apple-calendar-account`**
- Constructs `calendar.AppleCalendar` with the auth payload and associates it with the user’s calendar account record (type `apple`).

### CalDAV implementation

File: `server/services/calendar/apple_calendar.go`

- Decrypts the stored password with `utils.Decrypt` (expects **`ENCRYPTION_KEY`** in the environment—see `server/.env.template`).
- Builds an HTTP client with **basic auth** to **`https://caldav.icloud.com`**.
- `GetCalendarList`: WebDAV `FindCurrentUserPrincipal` → CalDAV `FindCalendarHomeSet` → `FindCalendars`, filters to calendars that support **`VEVENT`**.
- `GetCalendarEvents`: `QueryCalendar` with expanded `VEVENT` in the requested window; parses `DTSTART` / `DTEND`, all-day vs timed events, using `go-ical`.

### Checklist when something breaks

- **Invalid credentials**: wrong Apple ID, wrong app-specific password, or 2FA issues—Apple expects app-specific passwords, not the main Apple ID password.
- **Encryption**: if `ENCRYPTION_KEY` is wrong or rotated without re-encrypting stored passwords, decryption fails and CalDAV auth fails.
- **Scope of “Apple Calendar”**: this integration is **iCloud CalDAV**, not Google-imported calendars on the device unless those calendars are also on iCloud.
