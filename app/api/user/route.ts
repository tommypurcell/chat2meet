import { getDb } from "@/lib/firebase-admin";
import { getSessionUserId } from "@/lib/auth-session";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const db = getDb();
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data();

    // Fetch user's friends
    const friendsSnapshot = await db
      .collection("users")
      .doc(userId)
      .collection("friends")
      .where("status", "==", "accepted")
      .get();

    const friendIds = friendsSnapshot.docs.map((doc) => doc.id);

    const friends = await Promise.all(
      friendIds.map(async (friendId) => {
        const friendDoc = await db.collection("users").doc(friendId).get();
        const friendData = friendDoc.data();
        return {
          id: friendId,
          name: friendData?.name || friendData?.displayName || "Unknown",
          email: friendData?.email || "",
        };
      })
    );

    // Check calendar connection
    const calendarSnapshot = await db
      .collection("users")
      .doc(userId)
      .collection("calendarAccounts")
      .where("isActive", "==", true)
      .limit(1)
      .get();

    return NextResponse.json({
      id: userDoc.id,
      name: userData?.name || userData?.displayName || "",
      email: userData?.email || "",
      timezone: userData?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      calendarConnected: !calendarSnapshot.empty,
      preferences: userData?.preferences || {},
      friends,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const db = getDb();

    const allowedFields: Record<string, unknown> = {};
    if (body.preferences !== undefined) allowedFields.preferences = body.preferences;
    if (body.name !== undefined) allowedFields.name = body.name;
    if (body.timezone !== undefined) allowedFields.timezone = body.timezone;

    if (Object.keys(allowedFields).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    allowedFields.updatedAt = new Date();

    await db.collection("users").doc(userId).set(allowedFields, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
