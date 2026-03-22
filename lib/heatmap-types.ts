/**
 * Canonical heatmap slot structure
 * Server computes these, UI renders them
 */

export interface HeatmapSlot {
  day: string; // ISO date "2026-03-24"
  timeLabel: string; // "6:00 PM"
  start: string; // ISO timestamp
  end: string; // ISO timestamp
  availableCount: number; // 0..N
  totalCount: number; // N
  score: number; // 0..1 (availableCount / totalCount)
  availableUserIds: string[];
  unavailableUserIds: string[];
}

export interface HeatmapRequest {
  userIds: string[];
  startDate: string; // ISO date
  endDate: string; // ISO date
  durationMinutes: number;
  timezone: string;
  slotIntervalMinutes?: number; // default 30
}

export interface HeatmapResponse {
  success: boolean;
  slots: HeatmapSlot[];
  userIds: string[];
  startDate: string;
  endDate: string;
  timezone: string;
}
