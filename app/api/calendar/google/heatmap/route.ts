import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { decrypt, encrypt } from "@/lib/encryption";
import { collection, timestamps } from "@/lib/api-helpers";

/**
 * GET /api/calendar/google/heatmap
 * Analyze calendar data and return heatmap data showing busy hours
 *
 * Query params:
 * - userId: (required) User ID
 * - days: (optional) Number of days to analyze (default: 30)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const userId = searchParams.get("userId");
    const days = parseInt(searchParams.get("days") || "30");

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
            ? encrypt(credentials.access_token)
            : accountData.accessToken,
          tokenExpiresAt: credentials.expiry_date
            ? new Date(credentials.expiry_date)
            : null,
          updatedAt: ts.updatedAt,
        });
    }

    // Fetch events for the specified period
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - days);

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: startDate.toISOString(),
      timeMax: now.toISOString(),
      maxResults: 2500,
      singleEvents: true,
    });

    const events = response.data.items || [];

    // Initialize heatmap data structure
    // [day of week 0-6][hour 0-23] = count of events
    const heatmapData: number[][] = Array.from({ length: 7 }, () =>
      Array(24).fill(0)
    );

    // Count events per day/hour
    events.forEach((event) => {
      if (!event.start?.dateTime) return; // Skip all-day events

      const startTime = new Date(event.start.dateTime);
      const endTime = event.end?.dateTime
        ? new Date(event.end.dateTime)
        : new Date(startTime.getTime() + 60 * 60 * 1000); // Default 1 hour

      // Mark all hours this event spans
      let current = new Date(startTime);
      while (current < endTime) {
        const dayOfWeek = current.getDay(); // 0 = Sunday, 6 = Saturday
        const hour = current.getHours();
        heatmapData[dayOfWeek][hour]++;
        current = new Date(current.getTime() + 60 * 60 * 1000); // Add 1 hour
      }
    });

    // Calculate statistics
    const allCounts = heatmapData.flat();
    const maxBusyCount = Math.max(...allCounts);
    const avgBusyCount = allCounts.reduce((a, b) => a + b, 0) / allCounts.length;

    // Find busiest day and hour
    let busiestDay = 0;
    let busiestHour = 0;
    let busiestCount = 0;

    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        if (heatmapData[day][hour] > busiestCount) {
          busiestCount = heatmapData[day][hour];
          busiestDay = day;
          busiestHour = hour;
        }
      }
    }

    return NextResponse.json({
      success: true,
      heatmapData,
      stats: {
        totalEvents: events.length,
        daysAnalyzed: days,
        maxBusyCount,
        avgBusyCount: Math.round(avgBusyCount * 10) / 10,
        busiestDay: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][busiestDay],
        busiestHour: busiestHour,
        busiestCount,
      },
    });
  } catch (error) {
    console.error("Error generating calendar heatmap:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to generate heatmap: ${errorMessage}` },
      { status: 500 }
    );
  }
}
