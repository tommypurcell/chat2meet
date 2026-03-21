import { getDb } from "@/lib/firebase-admin";
import { NextResponse } from "next/server";

const CURRENT_USER_ID = "user_rae";
const EVENT_ID = "event_demo_pickleball";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const db = getDb();
    const { userId } = await params;

    // Fetch user data
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data();

    // Fetch availability for the event
    const availDoc = await db
      .collection("events")
      .doc(EVENT_ID)
      .collection("availability")
      .doc(userId)
      .get();

    const availability = availDoc.exists ? availDoc.data() : null;

    return NextResponse.json({
      id: userId,
      name: userData?.name || "",
      email: userData?.email || "",
      timezone: userData?.timezone || "",
      calendarConnected: userData?.calendarConnected ?? false,
      publicStatement: userData?.publicStatement || "",
      availability: {
        freeWindows: availability?.freeWindows || [],
        busyBlocks: availability?.busyBlocks || [],
      },
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}
