import { NextRequest } from "next/server";
import {
  collection,
  getDocOrError,
  extractFields,
  updateTimestamp,
  errorResponse,
  successResponse,
} from "@/lib/api-helpers";

// GET /api/events/[eventId]/availability/[userId] - Get user availability
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; userId: string }> }
) {
  try {
    const { eventId, userId } = await params;
    const availabilityRef = collection("events")
      .doc(eventId)
      .collection("availability")
      .doc(userId);

    const result = await getDocOrError(availabilityRef);
    return result.error || successResponse(result.data);
  } catch (error) {
    console.error("Error fetching availability:", error);
    return errorResponse("Failed to fetch availability");
  }
}

// PATCH /api/events/[eventId]/availability/[userId] - Update availability
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; userId: string }> }
) {
  try {
    const { eventId, userId } = await params;
    const body = await request.json();

    const updates = extractFields(body, [
      "source",
      "busyBlocks",
      "freeWindows",
      "lastSyncedAt",
    ]);

    if (Object.keys(updates).length === 0) {
      return errorResponse("No valid fields to update", 400);
    }

    const availabilityRef = collection("events")
      .doc(eventId)
      .collection("availability")
      .doc(userId);

    const result = await getDocOrError(availabilityRef);
    if (result.error) return result.error;

    await availabilityRef.update({ ...updates, ...updateTimestamp() });
    const updated = await availabilityRef.get();

    return successResponse({ id: updated.id, ...updated.data() });
  } catch (error) {
    console.error("Error updating availability:", error);
    return errorResponse("Failed to update availability");
  }
}

// DELETE /api/events/[eventId]/availability/[userId] - Delete availability
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; userId: string }> }
) {
  try {
    const { eventId, userId } = await params;
    const availabilityRef = collection("events")
      .doc(eventId)
      .collection("availability")
      .doc(userId);

    const result = await getDocOrError(availabilityRef);
    if (result.error) return result.error;

    await availabilityRef.delete();
    return successResponse({ success: true, message: "Availability deleted" });
  } catch (error) {
    console.error("Error deleting availability:", error);
    return errorResponse("Failed to delete availability");
  }
}
