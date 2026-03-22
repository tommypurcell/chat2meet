import { NextRequest } from "next/server";
import { collection, timestamps, errorResponse, successResponse } from "@/lib/api-helpers";

// POST /api/events - Create an event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.title || !body.createdBy || !body.dateRangeStart || !body.dateRangeEnd || !body.durationMinutes) {
      return errorResponse("title, createdBy, dateRangeStart, dateRangeEnd, and durationMinutes are required", 400);
    }

    const newEvent = {
      title: body.title,
      createdBy: body.createdBy,
      participantIds: body.participantIds || [body.createdBy],
      dateRangeStart: body.dateRangeStart,
      dateRangeEnd: body.dateRangeEnd,
      durationMinutes: body.durationMinutes,
      timezone: body.timezone || "America/Los_Angeles",
      status: body.status || "draft",
      bestSlot: body.bestSlot || null,
      finalizedSlot: body.finalizedSlot || null,
      ...timestamps(),
    };

    const docRef = await collection("events").add(newEvent);
    const doc = await docRef.get();

    return successResponse({ id: doc.id, ...doc.data() }, 201);
  } catch (error) {
    console.error("Error creating event:", error);
    return errorResponse("Failed to create event");
  }
}

// GET /api/events - List events
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const userId = searchParams.get("userId");
    const createdBy = searchParams.get("createdBy");
    const status = searchParams.get("status");
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);

    // Simple approach: fetch all events and filter in memory
    // This avoids needing composite indexes for small datasets
    let query: FirebaseFirestore.Query = collection("events")
      .orderBy("createdAt", "desc")
      .limit(100); // Fetch more than needed, then filter

    const snapshot = await query.get();
    let events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Filter in memory
    if (userId) {
      events = events.filter(e =>
        Array.isArray(e.participantIds) && e.participantIds.includes(userId)
      );
    }
    if (createdBy) {
      events = events.filter(e => e.createdBy === createdBy);
    }
    if (status) {
      events = events.filter(e => e.status === status);
    }

    // Apply client-side limit
    events = events.slice(0, limit);

    return successResponse({ events, count: events.length, limit });
  } catch (error) {
    console.error("Error fetching events:", error);
    return errorResponse("Failed to fetch events");
  }
}
