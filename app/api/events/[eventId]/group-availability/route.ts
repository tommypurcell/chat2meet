import { NextRequest } from "next/server";
import {
  collection,
  getDocOrError,
  errorResponse,
  successResponse,
} from "@/lib/api-helpers";
import { defaultEventTimeSlotLabels } from "@/lib/event-grid-slots";

type CellKey = `${number}-${number}`;

interface SlotDetail {
  dayIdx: number;
  slotIdx: number;
  time: string;
  availableUsers: string[];
  unavailableUsers: string[];
  score: number;
}

// POST /api/events/[eventId]/group-availability - Aggregate availability from all participants
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const body = await request.json();
    const { participantIds } = body;

    if (!Array.isArray(participantIds) || participantIds.length === 0) {
      return successResponse({ slots: [] });
    }

    const eventRef = collection("events").doc(eventId);
    const eventResult = await getDocOrError(eventRef);
    if (eventResult.error) return eventResult.error;

    // Fetch all participant availability
    const availabilitySnapshot = await eventRef.collection("availability").get();
    const participantAvailability: Record<string, Set<CellKey>> = {};
    const userIdToName: Record<string, string> = {};

    // Map user IDs to names
    availabilitySnapshot.docs.forEach((doc) => {
      const userId = doc.id;
      const data = doc.data();
      const slots = data?.slots || [];
      participantAvailability[userId] = new Set(slots);

      // Extract name from guest ID or use the ID itself
      if (userId.startsWith('guest_')) {
        userIdToName[userId] = userId.replace('guest_', '').replace(/_/g, ' ');
      } else {
        userIdToName[userId] = userId;
      }
    });

    // Same 30-min labels as event UI + parse-availability slot indices (9:00–17:00)
    const timeSlots = defaultEventTimeSlotLabels();

    // Calculate days from event date range
    const event = eventResult.data as {
      id: string;
      dateRangeStart: string;
      dateRangeEnd: string;
      [key: string]: unknown;
    };
    const startDate = new Date(event.dateRangeStart);
    const endDate = new Date(event.dateRangeEnd);
    const days: Date[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    // Aggregate availability for each slot
    const slots: SlotDetail[] = [];

    // Get all available user IDs (both from participantIds and availability collection)
    const allUserIds = new Set([...participantIds, ...Object.keys(participantAvailability)]);

    days.forEach((day, dayIdx) => {
      timeSlots.forEach((time, slotIdx) => {
        const key: CellKey = `${dayIdx}-${slotIdx}`;
        const availableUsers: string[] = [];
        const unavailableUsers: string[] = [];

        allUserIds.forEach((userId: string) => {
          const userSlots = participantAvailability[userId];
          const userName = userIdToName[userId] || userId;

          if (userSlots && userSlots.has(key)) {
            availableUsers.push(userName);
          } else {
            unavailableUsers.push(userName);
          }
        });

        const totalUsers = allUserIds.size;
        const score = totalUsers > 0 ? availableUsers.length / totalUsers : 0;

        slots.push({
          dayIdx,
          slotIdx,
          time,
          availableUsers,
          unavailableUsers,
          score,
        });
      });
    });

    return successResponse({ slots });
  } catch (error) {
    console.error("Error aggregating group availability:", error);
    return errorResponse("Failed to aggregate group availability");
  }
}
