import { NextRequest } from "next/server";
import {
  collection,
  getDocOrError,
  extractFields,
  updateTimestamp,
  errorResponse,
  successResponse,
} from "@/lib/api-helpers";

// GET /api/events/[eventId] - Get an event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const result = await getDocOrError(collection("events").doc(eventId));
    return result.error || successResponse(result.data);
  } catch (error) {
    console.error("Error fetching event:", error);
    return errorResponse("Failed to fetch event");
  }
}

// PATCH /api/events/[eventId] - Update an event
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const body = await request.json();

    const updates = extractFields(body, [
      "title",
      "participantIds",
      "dateRangeStart",
      "dateRangeEnd",
      "durationMinutes",
      "timezone",
      "status",
      "bestSlot",
      "finalizedSlot",
    ]);

    if (Object.keys(updates).length === 0) {
      return errorResponse("No valid fields to update", 400);
    }

    const eventRef = collection("events").doc(eventId);
    const result = await getDocOrError(eventRef);
    if (result.error) return result.error;

    await eventRef.update({ ...updates, ...updateTimestamp() });
    const updated = await eventRef.get();

    return successResponse({ id: updated.id, ...updated.data() });
  } catch (error) {
    console.error("Error updating event:", error);
    return errorResponse("Failed to update event");
  }
}

// DELETE /api/events/[eventId] - Delete an event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const eventRef = collection("events").doc(eventId);
    const result = await getDocOrError(eventRef);
    if (result.error) return result.error;

    await eventRef.delete();
    return successResponse({ success: true, message: "Event deleted" });
  } catch (error) {
    console.error("Error deleting event:", error);
    return errorResponse("Failed to delete event");
  }
}
