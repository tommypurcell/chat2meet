/**
 * Server-side helper to fetch a user's Google Calendar events.
 * Reusable from any server context (API routes, chat tools, etc.)
 */
import { google } from "googleapis";
import { decrypt, encrypt } from "@/lib/encryption";
import { collection, timestamps } from "@/lib/api-helpers";

export interface CalendarEventResult {
  id: string;
  summary: string;
  description: string | null;
  start: string;
  end: string;
  location: string | null;
  attendees: string[];
}

/**
 * Fetch real Google Calendar events for a user from Firestore-stored tokens.
 * Returns null if the user has no connected calendar.
 */
export async function fetchUserCalendarEvents(
  userId: string,
  timeMin?: string,
  timeMax?: string,
  maxResults = 50,
): Promise<CalendarEventResult[] | null> {
  // Get calendar account from Firestore
  const accountsSnapshot = await collection("users")
    .doc(userId)
    .collection("calendarAccounts")
    .where("provider", "==", "google")
    .where("isActive", "==", true)
    .limit(1)
    .get();

  if (accountsSnapshot.empty) return null;

  const accountDoc = accountsSnapshot.docs[0];
  const accountData = accountDoc.data();

  // Decrypt tokens
  const accessToken = decrypt(accountData.accessToken);
  const refreshToken = accountData.refreshToken
    ? decrypt(accountData.refreshToken)
    : null;

  // Set up OAuth client
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.OAUTH_REDIRECT_URI,
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  // Check if token needs refresh
  const tokenExpiresAt = accountData.tokenExpiresAt?.toDate();
  if (tokenExpiresAt && tokenExpiresAt <= new Date()) {
    if (!refreshToken) return null;

    const { credentials } = await oauth2Client.refreshAccessToken();
    const ts = timestamps();
    await collection("users")
      .doc(userId)
      .collection("calendarAccounts")
      .doc(accountDoc.id)
      .update({
        accessToken: credentials.access_token
          ? encrypt(credentials.access_token)
          : accountData.accessToken,
        tokenExpiresAt: credentials.expiry_date
          ? new Date(credentials.expiry_date)
          : null,
        updatedAt: ts.updatedAt,
      });
  }

  // Fetch events
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const now = new Date();
  const requestParams: Record<string, unknown> = {
    calendarId: "primary",
    timeMin: timeMin || now.toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: "startTime",
  };

  if (timeMax) {
    requestParams.timeMax = timeMax;
  }

  const response = await calendar.events.list(requestParams);
  const events = response.data.items || [];

  return events.map((event) => ({
    id: event.id || "",
    summary: event.summary || "No title",
    description: event.description || null,
    start: event.start?.dateTime || event.start?.date || "",
    end: event.end?.dateTime || event.end?.date || "",
    location: event.location || null,
    attendees: event.attendees?.map((a) => a.email || "") || [],
  }));
}
