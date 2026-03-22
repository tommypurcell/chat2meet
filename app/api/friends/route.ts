import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { getSessionUserId } from "@/lib/auth-session";

// GET /api/friends - List friends for authenticated user
export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const db = getDb();
    const friendsSnapshot = await db
      .collection("users")
      .doc(userId)
      .collection("friends")
      .get();

    const friends = await Promise.all(
      friendsSnapshot.docs.map(async (doc) => {
        const data = doc.data();
        // Try to get friend's profile for display name
        const friendDoc = await db.collection("users").doc(doc.id).get();
        const friendData = friendDoc.exists ? friendDoc.data() : null;

        return {
          id: doc.id,
          name: friendData?.name || friendData?.displayName || data.name || data.email?.split("@")[0] || "Unknown",
          email: friendData?.email || data.email || "",
          status: data.status || "accepted",
        };
      })
    );

    return NextResponse.json({ friends });
  } catch (error) {
    console.error("Error fetching friends:", error);
    return NextResponse.json({ error: "Failed to fetch friends" }, { status: 500 });
  }
}

// POST /api/friends - Send friend request by email
export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { emails } = await req.json();
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: "emails array is required" }, { status: 400 });
    }

    const db = getDb();
    const results: Array<{ email: string; status: string; id?: string }> = [];

    for (const email of emails) {
      // Find user by email
      const usersSnapshot = await db
        .collection("users")
        .where("email", "==", email)
        .limit(1)
        .get();

      if (usersSnapshot.empty) {
        // User not on platform yet - store as pending invite
        const inviteRef = db
          .collection("users")
          .doc(userId)
          .collection("friends")
          .doc();

        await inviteRef.set({
          email,
          status: "pending",
          createdAt: new Date(),
        });

        results.push({ email, status: "invited", id: inviteRef.id });
      } else {
        const friendDoc = usersSnapshot.docs[0];
        const friendId = friendDoc.id;

        if (friendId === userId) {
          results.push({ email, status: "skipped" });
          continue;
        }

        // Check if already friends
        const existingDoc = await db
          .collection("users")
          .doc(userId)
          .collection("friends")
          .doc(friendId)
          .get();

        if (existingDoc.exists) {
          results.push({ email, status: "already_exists", id: friendId });
          continue;
        }

        const friendData = friendDoc.data();

        // Add to current user's friends list
        await db
          .collection("users")
          .doc(userId)
          .collection("friends")
          .doc(friendId)
          .set({
            email: friendData?.email || email,
            name: friendData?.name || friendData?.displayName || email.split("@")[0],
            status: "accepted",
            createdAt: new Date(),
          });

        // Add reverse connection
        const currentUserDoc = await db.collection("users").doc(userId).get();
        const currentUserData = currentUserDoc.data();

        await db
          .collection("users")
          .doc(friendId)
          .collection("friends")
          .doc(userId)
          .set({
            email: currentUserData?.email || "",
            name: currentUserData?.name || currentUserData?.displayName || "",
            status: "accepted",
            createdAt: new Date(),
          });

        results.push({ email, status: "added", id: friendId });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Error adding friends:", error);
    return NextResponse.json({ error: "Failed to add friends" }, { status: 500 });
  }
}

// DELETE /api/friends - Remove a friend
export async function DELETE(req: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { friendId } = await req.json();
    if (!friendId) {
      return NextResponse.json({ error: "friendId is required" }, { status: 400 });
    }

    const db = getDb();

    // Remove from current user's friends
    await db
      .collection("users")
      .doc(userId)
      .collection("friends")
      .doc(friendId)
      .delete();

    // Remove reverse connection
    await db
      .collection("users")
      .doc(friendId)
      .collection("friends")
      .doc(userId)
      .delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing friend:", error);
    return NextResponse.json({ error: "Failed to remove friend" }, { status: 500 });
  }
}
