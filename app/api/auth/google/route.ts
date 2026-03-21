import { NextRequest, NextResponse } from "next/server";
import { buildGoogleAuthUrl } from "@/lib/google-calendar";

/**
 * GET /api/auth/google
 * Initiate Google OAuth flow for calendar access
 *
 * Query params:
 * - userId: User ID to associate the calendar with (encoded in state)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams, origin } = request.nextUrl;
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId query parameter is required" },
        { status: 400 }
      );
    }

    // Build redirect URI (must match Google Cloud Console config)
    const redirectUri = `${origin}/api/auth/google/callback`;

    // Encode user ID in state so we can retrieve it in the callback
    const state = JSON.stringify({ userId });

    // Build Google OAuth URL
    const authUrl = buildGoogleAuthUrl(redirectUri, state);

    // Redirect to Google OAuth consent screen
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Error initiating Google OAuth:", error);
    return NextResponse.json(
      { error: "Failed to initiate Google OAuth" },
      { status: 500 }
    );
  }
}
