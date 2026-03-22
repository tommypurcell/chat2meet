/**
 * Shared server-only logic for multi-user free/busy overlap.
 * Used by POST /api/calendar/availability and the chat findOverlap tool.
 */

import { google } from "googleapis";
import { decrypt, encrypt } from "@/lib/encryption";
import { collection, timestamps } from "@/lib/api-helpers";
import {
  eventsToBusyBlocks,
  calculateFreeWindows,
  findCommonFreeSlots,
  formatSlotsForLLM,
} from "@/lib/calendar-utils";
import type { FreeWindow, TimeSlot } from "@/lib/calendar-utils";

async function getFreeWindowsForUserInRange(
  userId: string,
  rangeStart: Date,
  rangeEnd: Date,
): Promise<FreeWindow[]> {
  const accountsSnapshot = await collection("users")
    .doc(userId)
    .collection("calendarAccounts")
    .where("provider", "==", "google")
    .where("isActive", "==", true)
    .limit(1)
    .get();

  if (accountsSnapshot.empty) {
    return [
      {
        start: rangeStart.toISOString(),
        end: rangeEnd.toISOString(),
        quality: "high",
      },
    ];
  }

  const accountDoc = accountsSnapshot.docs[0];
  const accountData = accountDoc.data();

  const accessToken = decrypt(accountData.accessToken);
  const refreshToken = accountData.refreshToken
    ? decrypt(accountData.refreshToken)
    : null;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.OAUTH_REDIRECT_URI,
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

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
  const busyBlocks = eventsToBusyBlocks(events);
  return calculateFreeWindows(busyBlocks, rangeStart, rangeEnd);
}

export async function buildUserAvailabilityMap(
  userIds: string[],
  rangeStart: Date,
  rangeEnd: Date,
): Promise<Map<string, FreeWindow[]>> {
  const userAvailability = new Map<string, FreeWindow[]>();

  for (const userId of userIds) {
    try {
      const windows = await getFreeWindowsForUserInRange(
        userId,
        rangeStart,
        rangeEnd,
      );
      userAvailability.set(userId, windows);
    } catch (error) {
      console.error(
        `[calendar-availability-core] Error for user ${userId}:`,
        error,
      );
      userAvailability.set(userId, []);
    }
  }

  return userAvailability;
}

export async function findCommonAvailabilityForUsers(options: {
  userIds: string[];
  rangeStart: Date;
  rangeEnd: Date;
  minDurationMinutes: number;
}): Promise<{
  commonSlots: TimeSlot[];
  summary: string;
  userAvailability: Map<string, FreeWindow[]>;
}> {
  const { userIds, rangeStart, rangeEnd, minDurationMinutes } = options;

  const userAvailability = await buildUserAvailabilityMap(
    userIds,
    rangeStart,
    rangeEnd,
  );

  const commonSlots = findCommonFreeSlots(userAvailability, minDurationMinutes);
  const summary = formatSlotsForLLM(commonSlots);

  return { commonSlots, summary, userAvailability };
}
