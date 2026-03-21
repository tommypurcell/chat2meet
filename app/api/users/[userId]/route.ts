import { NextRequest } from "next/server";
import {
  collection,
  getDocOrError,
  extractFields,
  updateTimestamp,
  errorResponse,
  successResponse,
} from "@/lib/api-helpers";

// GET /api/users/[userId] - Get a single user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const result = await getDocOrError(collection("users").doc(userId));
    return result.error || successResponse(result.data);
  } catch (error) {
    console.error("Error fetching user:", error);
    return errorResponse("Failed to fetch user");
  }
}

// PATCH /api/users/[userId] - Update a user
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const body = await request.json();

    const updates = extractFields(body, [
      "name",
      "email",
      "photoUrl",
      "timezone",
      "calendarConnected",
      "ghostMode",
    ]);

    if (Object.keys(updates).length === 0) {
      return errorResponse("No valid fields to update", 400);
    }

    const userRef = collection("users").doc(userId);
    const result = await getDocOrError(userRef);
    if (result.error) return result.error;

    await userRef.update({ ...updates, ...updateTimestamp() });
    const updated = await userRef.get();

    return successResponse({ id: updated.id, ...updated.data() });
  } catch (error) {
    console.error("Error updating user:", error);
    return errorResponse("Failed to update user");
  }
}

// DELETE /api/users/[userId] - Delete a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const userRef = collection("users").doc(userId);
    const result = await getDocOrError(userRef);
    if (result.error) return result.error;

    await userRef.delete();
    return successResponse({ success: true, message: "User deleted" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return errorResponse("Failed to delete user");
  }
}
