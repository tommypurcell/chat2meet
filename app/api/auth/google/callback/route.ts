import { NextRequest, NextResponse } from "next/server";
import { getDb, getServerTimestamp } from "@/lib/firebase-admin";
import { exchangeCodeForTokens } from "@/lib/google-calendar";

/**
 * GET /api/auth/google/callback
 * OAuth callback handler for Google Calendar
 *
 * Query params:
 * - code: Authorization code from Google
 * - state: JSON-encoded state containing userId
 * - error: Error message if OAuth failed
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams, origin } = request.nextUrl;
    const code = searchParams.get("code");
    const stateParam = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle OAuth errors
    if (error) {
      console.error("Google OAuth error:", error);
      return NextResponse.redirect(
        `${origin}/?error=${encodeURIComponent(`Calendar connection failed: ${error}`)}`
      );
    }

    // Validate required parameters
    if (!code || !stateParam) {
      return NextResponse.redirect(
        `${origin}/?error=${encodeURIComponent("Missing authorization code or state")}`
      );
    }

    // Decode state to get userId
    let state: { userId: string };
    try {
      state = JSON.parse(stateParam);
    } catch {
      return NextResponse.redirect(
        `${origin}/?error=${encodeURIComponent("Invalid state parameter")}`
      );
    }

    const { userId } = state;
    if (!userId) {
      return NextResponse.redirect(
        `${origin}/?error=${encodeURIComponent("Missing userId in state")}`
      );
    }

    // Exchange authorization code for tokens
    const redirectUri = `${origin}/api/auth/google/callback`;
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    // Store tokens in user document
    const db = getDb();
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.redirect(
        `${origin}/?error=${encodeURIComponent("User not found")}`
      );
    }

    // Update user with calendar tokens
    await userRef.update({
      googleCalendar: {
        connected: true,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        scope: tokens.scope,
        connectedAt: getServerTimestamp(),
      },
      calendarConnected: true,
      updatedAt: getServerTimestamp(),
    });

    // Redirect back to the app with success
    return NextResponse.redirect(
      `${origin}/?calendar=connected`
    );
  } catch (error) {
    console.error("Error in Google OAuth callback:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.redirect(
      `${new URL(request.url).origin}/?error=${encodeURIComponent(`Calendar connection failed: ${errorMessage}`)}`
    );
  }
}
