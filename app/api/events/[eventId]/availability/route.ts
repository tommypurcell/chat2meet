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
      slots: body.slots || [], // Grid-based availability (array of "dayIdx-slotIdx" strings)
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

// GET /api/events/[eventId]/availability - List availability or get specific user's availability
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const { searchParams } = request.nextUrl;
    const source = searchParams.get("source");
    const userId = searchParams.get("userId");

    const eventRef = collection("events").doc(eventId);
    const eventResult = await getDocOrError(eventRef);
    if (eventResult.error) return eventResult.error;

    // If userId is provided, fetch specific user's availability
    if (userId) {
      const availabilityRef = eventRef.collection("availability").doc(userId);
      const doc = await availabilityRef.get();

      if (!doc.exists) {
        return successResponse({ success: true, slots: [] });
      }

      const data = doc.data();
      return successResponse({ success: true, slots: data?.slots || [] });
    }

    // Otherwise, list all availability
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
