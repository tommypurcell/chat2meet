import { NextRequest } from "next/server";
import { collection, timestamps, errorResponse, successResponse } from "@/lib/api-helpers";

// POST /api/network - Create a connection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.ownerUserId || !body.memberUserId) {
      return errorResponse("ownerUserId and memberUserId are required", 400);
    }

    const newConnection = {
      status: body.status || "pending",
      ...timestamps(),
    };

    const docRef = collection("network")
      .doc(body.ownerUserId)
      .collection("friends")
      .doc(body.memberUserId);

    await docRef.set(newConnection);
    const doc = await docRef.get();

    return successResponse({ memberUserId: body.memberUserId, ...doc.data() }, 201);
  } catch (error) {
    console.error("Error creating connection:", error);
    return errorResponse("Failed to create connection");
  }
}

// GET /api/network - List friends for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);

    if (!userId) {
      return errorResponse("userId query parameter is required", 400);
    }

    let query = collection("network")
      .doc(userId)
      .collection("friends")
      .orderBy("createdAt", "desc")
      .limit(limit);

    if (status) {
      query = query.where("status", "==", status);
    }

    const snapshot = await query.get();
    const friends = snapshot.docs.map(doc => ({
      friendUserId: doc.id,
      ...doc.data()
    }));

    return successResponse({ friends, count: friends.length, limit });
  } catch (error) {
    console.error("Error fetching friends:", error);
    return errorResponse("Failed to fetch friends");
  }
}
