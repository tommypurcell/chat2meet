import { NextRequest } from "next/server";
import { collection, timestamps, errorResponse, successResponse } from "@/lib/api-helpers";

// POST /api/users - Create a new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || !body.email) {
      return errorResponse("name and email are required", 400);
    }

    const newUser = {
      name: body.name,
      email: body.email,
      photoUrl: body.photoUrl || "",
      timezone: body.timezone || "America/Los_Angeles",
      calendarConnected: body.calendarConnected || false,
      ghostMode: body.ghostMode || false,
      ...timestamps(),
    };

    const docRef = await collection("users").add(newUser);
    const doc = await docRef.get();

    return successResponse({ id: doc.id, ...doc.data() }, 201);
  } catch (error) {
    console.error("Error creating user:", error);
    return errorResponse("Failed to create user");
  }
}

// GET /api/users - List all users
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);
    const offset = Number(searchParams.get("offset")) || 0;

    const snapshot = await collection("users")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .offset(offset)
      .get();

    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return successResponse({ users, count: users.length, limit, offset });
  } catch (error) {
    console.error("Error fetching users:", error);
    return errorResponse("Failed to fetch users");
  }
}
