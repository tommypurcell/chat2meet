import { NextRequest } from "next/server";
import {
  collection,
  getDocOrError,
  extractFields,
  updateTimestamp,
  errorResponse,
  successResponse,
} from "@/lib/api-helpers";

// GET /api/network/[connectionId] - Get a connection
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ connectionId: string }> }
) {
  try {
    const { connectionId } = await params;
    const result = await getDocOrError(collection("network").doc(connectionId));
    return result.error || successResponse(result.data);
  } catch (error) {
    console.error("Error fetching connection:", error);
    return errorResponse("Failed to fetch connection");
  }
}

// PATCH /api/network/[connectionId] - Update a connection
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ connectionId: string }> }
) {
  try {
    const { connectionId } = await params;
    const body = await request.json();

    const updates = extractFields(body, [
      "memberName",
      "memberEmail",
      "memberPhotoUrl",
      "relationStatus",
    ]);

    if (Object.keys(updates).length === 0) {
      return errorResponse("No valid fields to update", 400);
    }

    const connectionRef = collection("network").doc(connectionId);
    const result = await getDocOrError(connectionRef);
    if (result.error) return result.error;

    await connectionRef.update({ ...updates, ...updateTimestamp() });
    const updated = await connectionRef.get();

    return successResponse({ id: updated.id, ...updated.data() });
  } catch (error) {
    console.error("Error updating connection:", error);
    return errorResponse("Failed to update connection");
  }
}

// DELETE /api/network/[connectionId] - Delete a connection
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ connectionId: string }> }
) {
  try {
    const { connectionId } = await params;
    const connectionRef = collection("network").doc(connectionId);
    const result = await getDocOrError(connectionRef);
    if (result.error) return result.error;

    await connectionRef.delete();
    return successResponse({ success: true, message: "Connection deleted" });
  } catch (error) {
    console.error("Error deleting connection:", error);
    return errorResponse("Failed to delete connection");
  }
}
