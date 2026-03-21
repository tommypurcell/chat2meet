import { NextRequest, NextResponse } from "next/server";
import { getDb, getServerTimestamp } from "@/lib/firebase-admin";
import type { EventAvailabilityDoc } from "@/lib/types";

/**
 * GET /api/events/[eventId]/availability/[userId]
 * Get availability for a specific user in an event
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; userId: string }> }
) {
  try {
    const { eventId, userId } = await params;

    const db = getDb();
    const eventRef = db.collection("events").doc(eventId);
    const availabilityRef = eventRef.collection("availability").doc(userId);
    const availabilityDoc = await availabilityRef.get();

    if (!availabilityDoc.exists) {
      return NextResponse.json(
        { error: "Availability not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: availabilityDoc.id,
      ...availabilityDoc.data(),
    });
  } catch (error) {
    console.error("Error fetching availability:", error);
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/events/[eventId]/availability/[userId]
 * Update availability for a user
 *
 * Body can include: source, busyBlocks, freeWindows, lastSyncedAt
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; userId: string }> }
) {
  try {
    const { eventId, userId } = await params;
    const body = await request.json();

    // Fields that can be updated
    const allowedFields = ["source", "busyBlocks", "freeWindows", "lastSyncedAt"];

    // Filter out any fields that aren't allowed
    const updates: Partial<EventAvailabilityDoc> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field as keyof EventAvailabilityDoc] = body[field];
      }
    }

    // Make sure we have at least one field to update
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Add updated timestamp
    const updateData = {
      ...updates,
      updatedAt: getServerTimestamp(),
    };

    // Update the document in Firestore
    const db = getDb();
    const eventRef = db.collection("events").doc(eventId);
    const availabilityRef = eventRef.collection("availability").doc(userId);

    // Check if availability exists first
    const availabilityDoc = await availabilityRef.get();
    if (!availabilityDoc.exists) {
      return NextResponse.json(
        { error: "Availability not found" },
        { status: 404 }
      );
    }

    await availabilityRef.update(updateData);

    // Fetch and return the updated availability
    const updatedDoc = await availabilityRef.get();
    return NextResponse.json({
      id: updatedDoc.id,
      ...updatedDoc.data(),
    });
  } catch (error) {
    console.error("Error updating availability:", error);
    return NextResponse.json(
      { error: "Failed to update availability" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/events/[eventId]/availability/[userId]
 * Delete availability for a user
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; userId: string }> }
) {
  try {
    const { eventId, userId } = await params;

    const db = getDb();
    const eventRef = db.collection("events").doc(eventId);
    const availabilityRef = eventRef.collection("availability").doc(userId);

    // Check if availability exists
    const availabilityDoc = await availabilityRef.get();
    if (!availabilityDoc.exists) {
      return NextResponse.json(
        { error: "Availability not found" },
        { status: 404 }
      );
    }

    // Delete the availability document
    await availabilityRef.delete();

    return NextResponse.json({
      success: true,
      message: "Availability deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting availability:", error);
    return NextResponse.json(
      { error: "Failed to delete availability" },
      { status: 500 }
    );
  }
}
