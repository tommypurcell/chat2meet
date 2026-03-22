import { NextRequest, NextResponse } from "next/server";
import { buildHeatmapSlots } from "@/lib/calendar/build-heatmap";
import { HeatmapRequest, HeatmapResponse } from "@/lib/heatmap-types";

/**
 * POST /api/calendar/heatmap
 *
 * Compute availability heatmap for multiple users
 *
 * Body:
 * {
 *   "userIds": ["uid1", "uid2"],
 *   "startDate": "2026-03-22",
 *   "endDate": "2026-03-29",
 *   "durationMinutes": 60,
 *   "timezone": "America/Los_Angeles",
 *   "slotIntervalMinutes": 30  // optional, default 30
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body: HeatmapRequest = await request.json();

    const { userIds, startDate, endDate, durationMinutes, timezone, slotIntervalMinutes } = body;

    // Validation
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "userIds array is required" },
        { status: 400 }
      );
    }

    if (!startDate || !endDate || !durationMinutes || !timezone) {
      return NextResponse.json(
        {
          success: false,
          error: "startDate, endDate, durationMinutes, and timezone are required",
        },
        { status: 400 }
      );
    }

    console.log("=== HEATMAP API: Building slots ===");
    console.log("Users:", userIds);
    console.log("Date range:", startDate, "to", endDate);
    console.log("Duration:", durationMinutes, "minutes");
    console.log("Timezone:", timezone);

    // Build heatmap slots
    const slots = await buildHeatmapSlots({
      userIds,
      startDate,
      endDate,
      durationMinutes,
      timezone,
      slotIntervalMinutes,
    });

    console.log(`Generated ${slots.length} heatmap slots`);

    const response: HeatmapResponse = {
      success: true,
      slots,
      userIds,
      startDate,
      endDate,
      timezone,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error building heatmap:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to build heatmap",
      },
      { status: 500 }
    );
  }
}
