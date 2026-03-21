import type { Query } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { getDb, getServerTimestamp } from "@/lib/firebase-admin";
import type { EventAvailabilityDoc } from "@/lib/types";

/**
 * POST /api/events/[eventId]/availability
 * Add or update availability for a user in an event
 *
 * Required body fields: userId
 * Optional fields: source, busyBlocks, freeWindows, lastSyncedAt
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const body = await request.json();

    // Validate required fields
    if (!body.userId) {
      return NextResponse.json(
        { error: "Missing required field: userId" },
        { status: 400 }
      );
    }

    // Check if event exists
    const db = getDb();
    const eventRef = db.collection("events").doc(eventId);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Create the availability document
    const timestamp = getServerTimestamp();
    const newAvailability: Omit<
      EventAvailabilityDoc,
      "lastSyncedAt" | "updatedAt"
    > & {
      lastSyncedAt: typeof timestamp;
      updatedAt: typeof timestamp;
    } = {
      userId: body.userId,
      source: body.source || "unknown",
      busyBlocks: body.busyBlocks || [],
      freeWindows: body.freeWindows || [],
      lastSyncedAt: body.lastSyncedAt || timestamp,
      updatedAt: timestamp,
    };

    // Add to the availability subcollection
    // Using userId as the document ID for easy lookups
    const availabilityRef = eventRef
      .collection("availability")
      .doc(body.userId);

    // Use set with merge to create or update
    await availabilityRef.set(newAvailability, { merge: true });

    // Fetch the created/updated document to return it
    const createdDoc = await availabilityRef.get();

    return NextResponse.json(
      {
        id: createdDoc.id,
        ...createdDoc.data(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding availability:", error);
    return NextResponse.json(
      { error: "Failed to add availability" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/events/[eventId]/availability
 * List all availability records for an event
 *
 * Query params:
 * - source: filter by source (google_calendar, manual, unknown)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const source = searchParams.get("source");

    // Check if event exists
    const db = getDb();
    const eventRef = db.collection("events").doc(eventId);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Query availability subcollection
    let query: Query = eventRef.collection("availability");

    // Add source filter if provided
    if (source) {
      query = query.where("source", "==", source);
    }

    const snapshot = await query.get();

    // Map documents to include their IDs
    const availability = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      availability,
      count: availability.length,
    });
  } catch (error) {
    console.error("Error fetching availability:", error);
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: 500 }
    );
  }
}
