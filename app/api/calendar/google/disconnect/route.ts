import { NextRequest, NextResponse } from "next/server";
import { collection, timestamps } from "@/lib/api-helpers";

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

    // Get all Google calendar accounts for this user
    const accountsSnapshot = await collection("users")
      .doc(userId)
      .collection("calendarAccounts")
      .where("provider", "==", "google")
      .get();

    if (accountsSnapshot.empty) {
      return NextResponse.json(
        { success: true, message: "No Google Calendar connection found" },
        { status: 200 }
      );
    }

    // Delete all Google calendar account documents
    const batch = collection("users").firestore.batch();
    accountsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    // Update user document to reflect disconnection
    const ts = timestamps();
    await collection("users").doc(userId).update({
      calendarConnected: false,
      connectedCalendars: [],
      lastCalendarSync: null,
      updatedAt: ts.updatedAt,
    });

    return NextResponse.json({
      success: true,
      message: "Google Calendar disconnected successfully",
      deletedAccounts: accountsSnapshot.size,
    });
  } catch (error) {
    console.error("Error disconnecting Google Calendar:", error);
    return NextResponse.json(
      {
        error: "Failed to disconnect Google Calendar",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
