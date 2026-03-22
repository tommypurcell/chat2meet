import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { decrypt } from "@/lib/encryption";
import { collection, timestamps } from "@/lib/api-helpers";

/**
 * GET /api/calendar/google/calendars
 * Fetch list of Google Calendars for a user using their stored credentials
 *
 * Query params:
 * - userId: (required) User ID
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const userId = searchParams.get("userId");

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
      if (!refreshToken) {
        return NextResponse.json(
          { error: "Token expired and no refresh token available" },
          { status: 401 }
        );
      }

      const { credentials } = await oauth2Client.refreshAccessToken();
      const ts = timestamps();
      await collection("users")
        .doc(userId)
        .collection("calendarAccounts")
        .doc(accountDoc.id)
        .update({
          accessToken: credentials.access_token
            ? (await import("@/lib/encryption")).encrypt(credentials.access_token)
            : accountData.accessToken,
          tokenExpiresAt: credentials.expiry_date
            ? new Date(credentials.expiry_date)
            : null,
          updatedAt: ts.updatedAt,
        });
    }

    // Fetch calendar list
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    const response = await calendar.calendarList.list();
    const calendars = response.data.items || [];

    return NextResponse.json({
      success: true,
      calendars: calendars.map((cal) => ({
        id: cal.id,
        summary: cal.summary || "Untitled",
        primary: cal.primary || false,
        backgroundColor: cal.backgroundColor || null,
        accessRole: cal.accessRole || null,
        selected: cal.selected || false,
      })),
      selectedCalendarId: accountData.selectedCalendarId || null,
    });
  } catch (error) {
    console.error("Error fetching Google calendars:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch calendars: ${errorMessage}` },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calendar/google/calendars
 * Save the user's selected calendar ID
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, calendarId } = await request.json();

    if (!userId || !calendarId) {
      return NextResponse.json(
        { error: "userId and calendarId are required" },
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
    const ts = timestamps();

    await collection("users")
      .doc(userId)
      .collection("calendarAccounts")
      .doc(accountDoc.id)
      .update({
        selectedCalendarId: calendarId,
        updatedAt: ts.updatedAt,
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving calendar selection:", error);
    return NextResponse.json(
      { error: "Failed to save calendar selection" },
      { status: 500 }
    );
  }
}
