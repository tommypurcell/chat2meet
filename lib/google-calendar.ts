/**
 * Google Calendar OAuth and API helpers
 */

function googleOAuthClientId(): string {
  return (
    process.env.GOOGLE_OAUTH_CLIENT_ID ||
    process.env.GOOGLE_CLIENT_ID ||
    ""
  );
}

function googleOAuthClientSecret(): string {
  return (
    process.env.GOOGLE_OAUTH_CLIENT_SECRET ||
    process.env.GOOGLE_CLIENT_SECRET ||
    ""
  );
}

export const GOOGLE_OAUTH_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar", // Full calendar access (read + write)
  "https://www.googleapis.com/auth/calendar.events", // Events read + write
];

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
  id_token?: string;
}

export interface GoogleCalendar {
  id: string;
  summary: string;
  primary?: boolean;
  backgroundColor?: string;
  foregroundColor?: string;
  selected?: boolean;
  accessRole?: string;
}

export interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  status?: string;
  transparency?: string;
}

export interface BusyTime {
  start: string;
  end: string;
}

/**
 * Build Google OAuth authorization URL
 */
export function buildGoogleAuthUrl(redirectUri: string, state?: string): string {
  const params = new URLSearchParams({
    client_id: googleOAuthClientId(),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_OAUTH_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
  });

  if (state) {
    params.set("state", state);
  }

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<GoogleTokens> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: googleOAuthClientId(),
      client_secret: googleOAuthClientSecret(),
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return response.json();
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: googleOAuthClientId(),
      client_secret: googleOAuthClientSecret(),
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  return response.json();
}

/**
 * Fetch calendar list from Google Calendar API
 */
export async function getCalendarList(accessToken: string): Promise<GoogleCalendar[]> {
  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch calendar list: ${error}`);
  }

  const data = await response.json();
  return data.items || [];
}

/**
 * Fetch events from a specific calendar
 */
export async function getCalendarEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string
): Promise<GoogleCalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
  });

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch calendar events: ${error}`);
  }

  const data = await response.json();
  return data.items || [];
}

/**
 * Get busy times from calendar events
 */
export function extractBusyTimes(events: GoogleCalendarEvent[]): BusyTime[] {
  return events
    .filter(event => {
      // Filter out all-day events and transparent (free) events
      return event.start.dateTime && event.transparency !== "transparent";
    })
    .map(event => ({
      start: event.start.dateTime!,
      end: event.end.dateTime!,
    }));
}

/**
 * Fetch busy times across multiple calendars
 */
export async function getBusyTimes(
  accessToken: string,
  calendars: string[],
  timeMin: string,
  timeMax: string
): Promise<BusyTime[]> {
  const allBusyTimes: BusyTime[] = [];

  await Promise.all(
    calendars.map(async (calendarId) => {
      try {
        const events = await getCalendarEvents(accessToken, calendarId, timeMin, timeMax);
        const busyTimes = extractBusyTimes(events);
        allBusyTimes.push(...busyTimes);
      } catch (error) {
        console.error(`Error fetching events for calendar ${calendarId}:`, error);
      }
    })
  );

  // Sort by start time
  return allBusyTimes.sort((a, b) =>
    new Date(a.start).getTime() - new Date(b.start).getTime()
  );
}
