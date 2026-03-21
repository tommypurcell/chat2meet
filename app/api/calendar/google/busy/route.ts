import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { getBusyTimes, refreshAccessToken } from "@/lib/google-calendar";

/**
 * GET /api/calendar/google/busy
 * Fetch busy times from Google Calendar
 *
 * Query params:
 * - userId: (required) User ID
 * - timeMin: (required) Start time (ISO 8601)
 * - timeMax: (required) End time (ISO 8601)
 * - calendars: (optional) Comma-separated list of calendar IDs (default: primary)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const userId = searchParams.get("userId");
    const timeMin = searchParams.get("timeMin");
    const timeMax = searchParams.get("timeMax");
    const calendarsParam = searchParams.get("calendars");

    if (!userId || !timeMin || !timeMax) {
      return NextResponse.json(
        { error: "userId, timeMin, and timeMax are required" },
        { status: 400 }
      );
    }

    // Parse calendar IDs (default to primary)
    const calendarIds = calendarsParam
      ? calendarsParam.split(",").map((id) => id.trim())
      : ["primary"];

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

    // Fetch busy times from Google
    const busyTimes = await getBusyTimes(
      accessToken,
      calendarIds,
      timeMin,
      timeMax
    );

    return NextResponse.json({
      busyTimes,
      timeMin,
      timeMax,
      calendars: calendarIds,
    });
  } catch (error) {
    console.error("Error fetching busy times:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch busy times: ${errorMessage}` },
      { status: 500 }
    );
  }
}
