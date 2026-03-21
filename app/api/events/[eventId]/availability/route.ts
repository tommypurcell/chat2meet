import { NextRequest } from "next/server";
import {
  collection,
  getDocOrError,
  timestamps,
  errorResponse,
  successResponse,
} from "@/lib/api-helpers";

// POST /api/events/[eventId]/availability - Add/update availability
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const body = await request.json();

    if (!body.userId) {
      return errorResponse("userId is required", 400);
    }

    const eventRef = collection("events").doc(eventId);
    const eventResult = await getDocOrError(eventRef);
    if (eventResult.error) return eventResult.error;

    const ts = timestamps();
    const newAvailability = {
      userId: body.userId,
      source: body.source || "unknown",
      busyBlocks: body.busyBlocks || [],
      freeWindows: body.freeWindows || [],
      lastSyncedAt: body.lastSyncedAt || ts.createdAt,
      updatedAt: ts.updatedAt,
    };

    const availabilityRef = eventRef.collection("availability").doc(body.userId);
    await availabilityRef.set(newAvailability, { merge: true });
    const doc = await availabilityRef.get();

    return successResponse({ id: doc.id, ...doc.data() }, 201);
  } catch (error) {
    console.error("Error adding availability:", error);
    return errorResponse("Failed to add availability");
  }
}

// GET /api/events/[eventId]/availability - List availability
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const { searchParams } = request.nextUrl;
    const source = searchParams.get("source");

    const eventRef = collection("events").doc(eventId);
    const eventResult = await getDocOrError(eventRef);
    if (eventResult.error) return eventResult.error;

    let query: FirebaseFirestore.Query = eventRef.collection("availability");
    if (source) {
      query = query.where("source", "==", source);
    }

    const snapshot = await query.get();
    const availability = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return successResponse({ availability, count: availability.length });
  } catch (error) {
    console.error("Error fetching availability:", error);
    return errorResponse("Failed to fetch availability");
  }
}
