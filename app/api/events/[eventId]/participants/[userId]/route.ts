import { NextRequest } from "next/server";
import {
  collection,
  getDocOrError,
  extractFields,
  updateTimestamp,
  arrayRemove,
  errorResponse,
  successResponse,
} from "@/lib/api-helpers";

// GET /api/events/[eventId]/participants/[userId] - Get a participant
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; userId: string }> }
) {
  try {
    const { eventId, userId } = await params;
    const participantRef = collection("events")
      .doc(eventId)
      .collection("participants")
      .doc(userId);

    const result = await getDocOrError(participantRef);
    return result.error || successResponse(result.data);
  } catch (error) {
    console.error("Error fetching participant:", error);
    return errorResponse("Failed to fetch participant");
  }
}

// PATCH /api/events/[eventId]/participants/[userId] - Update a participant
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; userId: string }> }
) {
  try {
    const { eventId, userId } = await params;
    const body = await request.json();

    const updates = extractFields(body, [
      "name",
      "email",
      "photoUrl",
      "role",
      "ghostMode",
      "calendarConnected",
    ]);

    if (Object.keys(updates).length === 0) {
      return errorResponse("No valid fields to update", 400);
    }

    const participantRef = collection("events")
      .doc(eventId)
      .collection("participants")
      .doc(userId);

    const result = await getDocOrError(participantRef);
    if (result.error) return result.error;

    await participantRef.update({ ...updates, ...updateTimestamp() });
    const updated = await participantRef.get();

    return successResponse({ id: updated.id, ...updated.data() });
  } catch (error) {
    console.error("Error updating participant:", error);
    return errorResponse("Failed to update participant");
  }
}

// DELETE /api/events/[eventId]/participants/[userId] - Remove a participant
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; userId: string }> }
) {
  try {
    const { eventId, userId } = await params;
    const eventRef = collection("events").doc(eventId);
    const participantRef = eventRef.collection("participants").doc(userId);

    const result = await getDocOrError(participantRef);
    if (result.error) return result.error;

    await participantRef.delete();
    await eventRef.update({
      participantIds: arrayRemove(userId),
      ...updateTimestamp(),
    });

    return successResponse({ success: true, message: "Participant removed" });
  } catch (error) {
    console.error("Error deleting participant:", error);
    return errorResponse("Failed to delete participant");
  }
}
