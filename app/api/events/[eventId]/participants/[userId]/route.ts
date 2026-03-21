import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { getDb, getServerTimestamp } from "@/lib/firebase-admin";
import type { EventParticipantDoc } from "@/lib/types";

/**
 * GET /api/events/[eventId]/participants/[userId]
 * Get a specific participant in an event
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; userId: string }> }
) {
  try {
    const { eventId, userId } = await params;

    const db = getDb();
    const eventRef = db.collection("events").doc(eventId);
    const participantRef = eventRef.collection("participants").doc(userId);
    const participantDoc = await participantRef.get();

    if (!participantDoc.exists) {
      return NextResponse.json(
        { error: "Participant not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: participantDoc.id,
      ...participantDoc.data(),
    });
  } catch (error) {
    console.error("Error fetching participant:", error);
    return NextResponse.json(
      { error: "Failed to fetch participant" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/events/[eventId]/participants/[userId]
 * Update a participant's information
 *
 * Body can include: name, email, photoUrl, role, ghostMode, calendarConnected
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; userId: string }> }
) {
  try {
    const { eventId, userId } = await params;
    const body = await request.json();

    // Fields that can be updated
    const allowedFields = [
      "name",
      "email",
      "photoUrl",
      "role",
      "ghostMode",
      "calendarConnected",
    ];

    // Filter out any fields that aren't allowed
    const updates: Partial<EventParticipantDoc> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field as keyof EventParticipantDoc] = body[field];
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
    const participantRef = eventRef.collection("participants").doc(userId);

    // Check if participant exists first
    const participantDoc = await participantRef.get();
    if (!participantDoc.exists) {
      return NextResponse.json(
        { error: "Participant not found" },
        { status: 404 }
      );
    }

    await participantRef.update(updateData);

    // Fetch and return the updated participant
    const updatedDoc = await participantRef.get();
    return NextResponse.json({
      id: updatedDoc.id,
      ...updatedDoc.data(),
    });
  } catch (error) {
    console.error("Error updating participant:", error);
    return NextResponse.json(
      { error: "Failed to update participant" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/events/[eventId]/participants/[userId]
 * Remove a participant from an event
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; userId: string }> }
) {
  try {
    const { eventId, userId } = await params;

    const db = getDb();
    const eventRef = db.collection("events").doc(eventId);
    const participantRef = eventRef.collection("participants").doc(userId);

    // Check if participant exists
    const participantDoc = await participantRef.get();
    if (!participantDoc.exists) {
      return NextResponse.json(
        { error: "Participant not found" },
        { status: 404 }
      );
    }

    // Delete the participant document
    await participantRef.delete();

    // Also remove from event's participantIds array
    await eventRef.update({
      participantIds: FieldValue.arrayRemove(userId),
      updatedAt: getServerTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: "Participant removed successfully",
    });
  } catch (error) {
    console.error("Error deleting participant:", error);
    return NextResponse.json(
      { error: "Failed to delete participant" },
      { status: 500 }
    );
  }
}
