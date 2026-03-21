import { NextResponse } from "next/server";
import { google } from "googleapis";

// GET /api/calendar/google/auth-url
// Generate Google OAuth URL for calendar access
export async function GET() {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.OAUTH_REDIRECT_URI
    );

    const scopes = [
      "https://www.googleapis.com/auth/calendar.events.readonly",
      "https://www.googleapis.com/auth/userinfo.email", // Get user email
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline", // Get refresh token
      prompt: "consent", // Force consent screen to ensure refresh token
      scope: scopes,
    });

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Error generating auth URL:", error);
    return NextResponse.json(
      { error: "Failed to generate auth URL" },
      { status: 500 }
    );
  }
}
