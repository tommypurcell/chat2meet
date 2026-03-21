import { NextRequest } from "next/server";
import {
  collection,
  getDocOrError,
  timestamps,
  arrayUnion,
  updateTimestamp,
  errorResponse,
  successResponse,
} from "@/lib/api-helpers";

// POST /api/events/[eventId]/participants - Add a participant
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const body = await request.json();

    if (!body.userId || !body.name || !body.email) {
      return errorResponse("userId, name, and email are required", 400);
    }

    const eventRef = collection("events").doc(eventId);
    const eventResult = await getDocOrError(eventRef);
    if (eventResult.error) return eventResult.error;

    const newParticipant = {
      userId: body.userId,
      name: body.name,
      email: body.email,
      photoUrl: body.photoUrl || "",
      role: body.role || "member",
      ghostMode: body.ghostMode || false,
      calendarConnected: body.calendarConnected || false,
      joinedAt: timestamps().createdAt,
      updatedAt: timestamps().updatedAt,
    };

    const participantRef = eventRef.collection("participants").doc(body.userId);
    const existing = await participantRef.get();

    if (existing.exists) {
      return errorResponse("Participant already exists in this event", 409);
    }

    await participantRef.set(newParticipant);
    await eventRef.update({
      participantIds: arrayUnion(body.userId),
      ...updateTimestamp(),
    });

    return successResponse({ id: body.userId, ...newParticipant }, 201);
  } catch (error) {
    console.error("Error adding participant:", error);
    return errorResponse("Failed to add participant");
  }
}

// GET /api/events/[eventId]/participants - List participants
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const { searchParams } = request.nextUrl;
    const role = searchParams.get("role");

    const eventRef = collection("events").doc(eventId);
    const eventResult = await getDocOrError(eventRef);
    if (eventResult.error) return eventResult.error;

    let query = eventRef.collection("participants");
    if (role) {
      query = query.where("role", "==", role);
    }

    const snapshot = await query.get();
    const participants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return successResponse({ participants, count: participants.length });
  } catch (error) {
    console.error("Error fetching participants:", error);
    return errorResponse("Failed to fetch participants");
  }
}
