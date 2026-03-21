import { getDb } from "@/lib/firebase-admin";
import { NextResponse } from "next/server";

const CURRENT_USER_ID = "user_rae";

export async function GET() {
  try {
    const db = getDb();
    const userDoc = await db.collection("users").doc(CURRENT_USER_ID).get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const userData = userDoc.data();

    // Fetch user's friends
    const friendsSnapshot = await db
      .collection("network")
      .doc(CURRENT_USER_ID)
      .collection("friends")
      .where("status", "==", "accepted")
      .get();

    const friendIds = friendsSnapshot.docs.map((doc) => doc.id);

    const friends = await Promise.all(
      friendIds.map(async (friendId) => {
        const userDoc = await db.collection("users").doc(friendId).get();
        const userData = userDoc.data();
        return {
          id: friendId,
          name: userData?.name || "Unknown",
          email: userData?.email || "",
        };
      })
    );

    return NextResponse.json({
      id: userDoc.id,
      name: userData?.name || "",
      email: userData?.email || "",
      timezone: userData?.timezone || "",
      calendarConnected: userData?.calendarConnected ?? false,
      friends,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}
