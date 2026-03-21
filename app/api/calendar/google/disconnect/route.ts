import { NextRequest, NextResponse } from "next/server";
import { getDb, getServerTimestamp } from "@/lib/firebase-admin";

/**
 * POST /api/calendar/google/disconnect
 * Disconnect Google Calendar from user account
 *
 * Body:
 * - userId: (required) User ID
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required in request body" },
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

    // Remove Google Calendar connection
    await userRef.update({
      googleCalendar: null,
      calendarConnected: false,
      updatedAt: getServerTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: "Google Calendar disconnected successfully",
    });
  } catch (error) {
    console.error("Error disconnecting Google Calendar:", error);
    return NextResponse.json(
      { error: "Failed to disconnect Google Calendar" },
      { status: 500 }
    );
  }
}
