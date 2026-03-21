import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { getCalendarList, refreshAccessToken } from "@/lib/google-calendar";

/**
 * GET /api/calendar/google/calendars
 * Fetch list of Google Calendars for a user
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

    // Get user document
    const db = getDb();
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data();
    const googleCalendar = userData?.googleCalendar;

    if (!googleCalendar?.connected) {
      return NextResponse.json(
        { error: "Google Calendar not connected" },
        { status: 400 }
      );
    }

    // Check if token is expired
    let accessToken = googleCalendar.accessToken;
    const expiresAt = new Date(googleCalendar.expiresAt);

    if (expiresAt <= new Date()) {
      // Token expired, refresh it
      if (!googleCalendar.refreshToken) {
        return NextResponse.json(
          { error: "Refresh token not available, please reconnect your calendar" },
          { status: 401 }
        );
      }

      const tokens = await refreshAccessToken(googleCalendar.refreshToken);
      accessToken = tokens.access_token;

      // Update stored tokens
      await userRef.update({
        "googleCalendar.accessToken": accessToken,
        "googleCalendar.expiresAt": new Date(
          Date.now() + tokens.expires_in * 1000
        ).toISOString(),
      });
    }

    // Fetch calendar list from Google
    const calendars = await getCalendarList(accessToken);

    return NextResponse.json({ calendars });
  } catch (error) {
    console.error("Error fetching Google calendars:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch calendars: ${errorMessage}` },
      { status: 500 }
    );
  }
}
