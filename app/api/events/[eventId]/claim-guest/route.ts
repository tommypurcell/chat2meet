import { NextRequest } from "next/server";
import { getSessionUserId } from "@/lib/auth-session";
import {
  collection,
  errorResponse,
  successResponse,
  timestamps,
} from "@/lib/api-helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const sessionUserId = await getSessionUserId();
    if (!sessionUserId) {
      return errorResponse("Unauthorized", 401);
    }

    const { eventId } = await params;
    const body = (await request.json()) as { guestId?: string };
    const guestId =
      typeof body.guestId === "string" ? body.guestId.trim() : "";

    if (!guestId) {
      return errorResponse("guestId is required", 400);
    }

    const eventRef = collection("events").doc(eventId);
    const eventSnap = await eventRef.get();
    if (!eventSnap.exists) {
      return errorResponse("Event not found", 404);
    }

    const event = eventSnap.data() as {
      createdBy?: string;
      creatorName?: string;
      participantIds?: string[];
    };

    const participantIds = Array.isArray(event.participantIds)
      ? event.participantIds.filter((id): id is string => typeof id === "string")
      : [];

    if (event.createdBy !== guestId && !participantIds.includes(guestId)) {
      return errorResponse("Guest is not attached to this event", 400);
    }

    const userRef = collection("users").doc(sessionUserId);
    const userSnap = await userRef.get();
    const userData = userSnap.data() as
      | { name?: string; email?: string }
      | undefined;
    const resolvedName =
      userData?.name?.trim() ||
      userData?.email?.split("@")[0] ||
      event.creatorName?.trim() ||
      "User";

    const participantRef = eventRef.collection("participants").doc(guestId);
    const participantSnap = await participantRef.get();
    const participantData = participantSnap.data();

    const availabilityRef = eventRef.collection("availability").doc(guestId);
    const availabilitySnap = await availabilityRef.get();
    const availabilityData = availabilitySnap.data();

    const uidParticipantRef = eventRef.collection("participants").doc(sessionUserId);
    const uidAvailabilityRef = eventRef.collection("availability").doc(sessionUserId);

    const nextParticipantIds = Array.from(
      new Set(
        participantIds.map((id) => (id === guestId ? sessionUserId : id)).concat(sessionUserId),
      ),
    );

    const ts = timestamps();
    const batch = eventRef.firestore.batch();

    batch.update(eventRef, {
      createdBy: event.createdBy === guestId ? sessionUserId : event.createdBy,
      creatorName: resolvedName,
      participantIds: nextParticipantIds,
      updatedAt: ts.updatedAt,
    });

    if (participantData) {
      batch.set(
        uidParticipantRef,
        {
          ...participantData,
          userId: sessionUserId,
          name: resolvedName,
          updatedAt: ts.updatedAt,
        },
        { merge: true },
      );
      if (guestId !== sessionUserId) {
        batch.delete(participantRef);
      }
    }

    if (availabilityData) {
      batch.set(
        uidAvailabilityRef,
        {
          ...availabilityData,
          userId: sessionUserId,
          updatedAt: ts.updatedAt,
        },
        { merge: true },
      );
      if (guestId !== sessionUserId) {
        batch.delete(availabilityRef);
      }
    }

    await batch.commit();

    return successResponse({
      success: true,
      eventId,
      userId: sessionUserId,
      claimedFromGuestId: guestId,
    });
  } catch (error) {
    console.error("Error claiming guest event:", error);
    return errorResponse("Failed to attach poll to account");
  }
}
