import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { decrypt, encrypt } from "@/lib/encryption";
import { collection, timestamps } from "@/lib/api-helpers";
import {
  eventsToBusyBlocks,
  calculateFreeWindows,
  findCommonFreeSlots,
  formatSlotsForLLM,
} from "@/lib/calendar-utils";

/**
 * POST /api/calendar/availability
 * Query user availability and find common free time slots
 *
 * Body:
 * - userIds: string[] - Array of user IDs to check
 * - startDate: string - ISO 8601 start date
 * - endDate: string - ISO 8601 end date
 * - minDuration: number (optional) - Minimum duration in minutes (default: 30)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userIds, startDate, endDate, minDuration = 30 } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: "userIds array is required" },
        { status: 400 }
      );
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate and endDate are required" },
        { status: 400 }
      );
    }

    const rangeStart = new Date(startDate);
    const rangeEnd = new Date(endDate);

    // Fetch availability for each user
    const userAvailability = new Map();

    for (const userId of userIds) {
      try {
        // Get calendar account
        const accountsSnapshot = await collection("users")
          .doc(userId)
          .collection("calendarAccounts")
          .where("provider", "==", "google")
          .where("isActive", "==", true)
          .limit(1)
          .get();

        if (accountsSnapshot.empty) {
          // User has no calendar connected - assume fully available during working hours
          userAvailability.set(userId, [
            {
              start: rangeStart.toISOString(),
              end: rangeEnd.toISOString(),
              quality: "high" as const,
            },
          ]);
          continue;
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
            throw new Error(`Token expired for user ${userId}`);
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

        // Fetch events from Google Calendar
        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

        const selectedCalendarId = accountData.selectedCalendarId || "primary";

        const response = await calendar.events.list({
          calendarId: selectedCalendarId,
          timeMin: rangeStart.toISOString(),
          timeMax: rangeEnd.toISOString(),
          maxResults: 2500,
          singleEvents: true,
        });

        const events = response.data.items || [];

        // Convert to busy blocks
        const busyBlocks = eventsToBusyBlocks(events);

        // Calculate free windows
        const freeWindows = calculateFreeWindows(
          busyBlocks,
          rangeStart,
          rangeEnd
        );

        userAvailability.set(userId, freeWindows);
      } catch (error) {
        console.error(`Error fetching availability for user ${userId}:`, error);
        // On error, assume user is unavailable
        userAvailability.set(userId, []);
      }
    }

    // Find common free slots
    const commonSlots = findCommonFreeSlots(userAvailability, minDuration);

    // Format for LLM
    const formattedSlots = formatSlotsForLLM(commonSlots);

    return NextResponse.json({
      success: true,
      slots: commonSlots,
      summary: formattedSlots,
      userCount: userIds.length,
      dateRange: {
        start: startDate,
        end: endDate,
      },
    });
  } catch (error) {
    console.error("Error querying calendar availability:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to query availability: ${errorMessage}` },
      { status: 500 }
    );
  }
}
