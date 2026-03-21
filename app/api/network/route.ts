import { NextRequest } from "next/server";
import { collection, timestamps, errorResponse, successResponse } from "@/lib/api-helpers";

// POST /api/network - Create a connection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.ownerUserId || !body.memberUserId || !body.memberName || !body.memberEmail) {
      return errorResponse("ownerUserId, memberUserId, memberName, and memberEmail are required", 400);
    }

    const newConnection = {
      ownerUserId: body.ownerUserId,
      memberUserId: body.memberUserId,
      memberName: body.memberName,
      memberEmail: body.memberEmail,
      memberPhotoUrl: body.memberPhotoUrl || "",
      relationStatus: body.relationStatus || "pending",
      ...timestamps(),
    };

    const docRef = await collection("network").add(newConnection);
    const doc = await docRef.get();

    return successResponse({ id: doc.id, ...doc.data() }, 201);
  } catch (error) {
    console.error("Error creating connection:", error);
    return errorResponse("Failed to create connection");
  }
}

// GET /api/network - List connections for a user
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
      .where("ownerUserId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(limit);

    if (status) {
      query = query.where("relationStatus", "==", status);
    }

    const snapshot = await query.get();
    const connections = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return successResponse({ connections, count: connections.length, limit });
  } catch (error) {
    console.error("Error fetching connections:", error);
    return errorResponse("Failed to fetch connections");
  }
}
