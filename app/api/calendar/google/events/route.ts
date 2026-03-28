import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { decrypt, encrypt } from "@/lib/encryption";
import { collection, timestamps } from "@/lib/api-helpers";
import { createCalendarEvent, type CreateEventParams } from "@/lib/google-calendar";

/**
 * GET /api/calendar/google/events
 * Fetch events from Google Calendar
 *
 * Query params:
 * - userId: (required) User ID
 * - timeMin: (optional) Start time ISO string (default: now)
 * - timeMax: (optional) End time ISO string (default: 1 month from now)
 * - maxResults: (optional) Max number of events to fetch (default: 100)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const userId = searchParams.get("userId");
    const timeMin = searchParams.get("timeMin") || new Date().toISOString();
    const timeMax = searchParams.get("timeMax");
    const maxResults = parseInt(searchParams.get("maxResults") || "100");
    const timeZone = searchParams.get("timeZone") || undefined;

    console.log("=== CALENDAR API: GET /api/calendar/google/events ===");
    console.log("Request params:", { userId, timeMin, timeMax, maxResults });

    if (!userId) {
      return NextResponse.json(
        { error: "userId query parameter is required" },
        { status: 400 }
      );
    }

    // Get calendar account from Firestore
    const accountsSnapshot = await collection("users")
      .doc(userId)
      .collection("calendarAccounts")
      .where("provider", "==", "google")
      .where("isActive", "==", true)
      .limit(1)
      .get();

    if (accountsSnapshot.empty) {
      return NextResponse.json(
        { error: "No active Google Calendar connection found" },
        { status: 404 }
      );
    }

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
      process.env.OAUTH_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    // Check if token needs refresh
    const tokenExpiresAt = accountData.tokenExpiresAt?.toDate();
    if (tokenExpiresAt && tokenExpiresAt <= new Date()) {
      // Token expired, refresh it
      if (!refreshToken) {
        return NextResponse.json(
          { error: "Token expired and no refresh token available" },
          { status: 401 }
        );
      }

      const { credentials } = await oauth2Client.refreshAccessToken();

      // Update stored tokens
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

    // Fetch events from Google Calendar
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const requestParams: any = {
      calendarId: "primary",
      timeMin: timeMin,
      maxResults: maxResults,
      singleEvents: true,
      orderBy: "startTime",
    };

    if (timeMax) {
      requestParams.timeMax = timeMax;
    }
    if (timeZone) {
      requestParams.timeZone = timeZone;
    }

    console.log("Fetching from Google Calendar with params:", requestParams);
    const response = await calendar.events.list(requestParams);

    const events = response.data.items || [];
    console.log(`Fetched ${events.length} events from Google Calendar`);

    const formattedEvents = events.map((event) => ({
      id: event.id,
      summary: event.summary || "No title",
      description: event.description || null,
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      location: event.location || null,
      attendees: event.attendees?.map((a) => a.email) || [],
      htmlLink: event.htmlLink,
    }));

    console.log("Formatted events:", JSON.stringify(formattedEvents, null, 2));

    return NextResponse.json({
      success: true,
      events: formattedEvents,
      email: accountData.email,
      totalEvents: events.length,
    });
  } catch (error) {
    console.error("Error fetching Google Calendar events:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch events: ${errorMessage}` },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calendar/google/events
 * Create a new event on the user's primary Google Calendar.
 *
 * Body (JSON):
 *   userId         – required
 *   summary        – required
 *   startDateTime  – ISO-8601 start
 *   endDateTime    – ISO-8601 end
 *   timeZone       – IANA timezone (optional, defaults to user pref or America/Los_Angeles)
 *   description    – optional
 *   attendeeEmails – optional string[]
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      summary,
      startDateTime,
      endDateTime,
      description,
      attendeeEmails,
    } = body as {
      userId?: string;
      summary?: string;
      startDateTime?: string;
      endDateTime?: string;
      description?: string;
      attendeeEmails?: string[];
    };

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
    if (!summary || !startDateTime || !endDateTime) {
      return NextResponse.json(
        { error: "summary, startDateTime, and endDateTime are required" },
        { status: 400 },
      );
    }

    const accountsSnapshot = await collection("users")
      .doc(userId)
      .collection("calendarAccounts")
      .where("provider", "==", "google")
      .where("isActive", "==", true)
      .limit(1)
      .get();

    if (accountsSnapshot.empty) {
      return NextResponse.json(
        { error: "No active Google Calendar connection found" },
        { status: 404 },
      );
    }

    const accountDoc = accountsSnapshot.docs[0];
    const accountData = accountDoc.data();

    let accessToken = decrypt(accountData.accessToken);
    const refreshToken = accountData.refreshToken
      ? decrypt(accountData.refreshToken)
      : null;

    const tokenExpiresAt = accountData.tokenExpiresAt?.toDate();
    if (tokenExpiresAt && tokenExpiresAt <= new Date()) {
      if (!refreshToken) {
        return NextResponse.json(
          { error: "Token expired and no refresh token available" },
          { status: 401 },
        );
      }

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.OAUTH_REDIRECT_URI,
      );
      oauth2Client.setCredentials({ refresh_token: refreshToken });

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

      if (credentials.access_token) {
        accessToken = credentials.access_token;
      }
    }

    let timeZone = body.timeZone as string | undefined;
    if (!timeZone) {
      try {
        const userSnap = await collection("users").doc(userId).get();
        const t = userSnap.data()?.timezone;
        if (typeof t === "string" && t.trim()) timeZone = t.trim();
      } catch {
        /* keep undefined — the helper still works */
      }
      timeZone ??= "America/Los_Angeles";
    }

    const created = await createCalendarEvent(accessToken, {
      summary,
      startDateTime,
      endDateTime,
      timeZone,
      description,
      attendeeEmails,
    });

    return NextResponse.json({ success: true, event: created });
  } catch (error) {
    console.error("Error creating Google Calendar event:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to create event: ${errorMessage}` },
      { status: 500 },
    );
  }
}
