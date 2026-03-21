import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { encrypt } from "@/lib/encryption";
import { collection, timestamps } from "@/lib/api-helpers";

// POST /api/calendar/google/connect
// Exchange OAuth code for tokens and save to Firestore
export async function POST(request: NextRequest) {
  try {
    const { code, userId } = await request.json();

    if (!code || !userId) {
      return NextResponse.json(
        { error: "code and userId are required" },
        { status: 400 }
      );
    }

    // Exchange authorization code for tokens
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.OAUTH_REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      return NextResponse.json(
        { error: "No access token received" },
        { status: 500 }
      );
    }

    // Decode ID token to get email (if available)
    let email = "";
    if (tokens.id_token) {
      try {
        // ID token is a JWT - decode the payload
        const payload = JSON.parse(
          Buffer.from(tokens.id_token.split(".")[1], "base64").toString()
        );
        email = payload.email || "";
      } catch (e) {
        console.warn("Could not decode id_token:", e);
      }
    }

    // Prepare calendar account data
    const ts = timestamps();
    const accountData = {
      provider: "google",
      email,
      isActive: true,

      // Encrypt sensitive tokens
      accessToken: encrypt(tokens.access_token),
      refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
      tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,

      connectedAt: ts.createdAt,
      lastSyncedAt: ts.createdAt,
      syncStatus: "active",
      syncError: null,

      createdAt: ts.createdAt,
      updatedAt: ts.updatedAt,
    };

    // Save to Firestore: users/{userId}/calendarAccounts
    const accountRef = await collection("users")
      .doc(userId)
      .collection("calendarAccounts")
      .add(accountData);

    // Update user's calendarConnected flag
    await collection("users").doc(userId).update({
      calendarConnected: true,
      connectedCalendars: ["google"],
      lastCalendarSync: ts.updatedAt,
      updatedAt: ts.updatedAt,
    });

    return NextResponse.json({
      success: true,
      accountId: accountRef.id,
      email,
    });
  } catch (error) {
    console.error("Error connecting Google calendar:", error);
    return NextResponse.json(
      {
        error: "Failed to connect calendar",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
