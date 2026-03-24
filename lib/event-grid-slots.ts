/**
 * Event poll slot indices are still anchored to 9:00 AM in storage / parsing,
 * but the visible grid can render a later window (for example 5 PM - 9 PM)
 * with optional padding around it.
 */
export const EVENT_GRID_BASE_HOUR = 9;
export const EVENT_GRID_DEFAULT_START = "09:00";
export const EVENT_GRID_DEFAULT_END = "17:00";
export const EVENT_GRID_MAX_SLOT_INDEX = 29; // 9:00 AM through 11:30 PM

type ClockTime = {
  hour: number;
  minute: number;
};

function parseClockTime(value: string): ClockTime | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23) return null;
  if (minute !== 0 && minute !== 30) return null;
  return { hour, minute };
}

export function slotIndexToTimeLabel(slotIdx: number): string {
  const totalMinutes = EVENT_GRID_BASE_HOUR * 60 + slotIdx * 30;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${hour}:${minute.toString().padStart(2, "0")}`;
}

export function timeLabelToSlotIndex(value: string): number | null {
  const parsed = parseClockTime(value);
  if (!parsed) return null;
  return (parsed.hour - EVENT_GRID_BASE_HOUR) * 2 + parsed.minute / 30;
}

export function defaultEventTimeSlotLabels(
  startSlotIdx: number = 0,
  endSlotIdx: number = 16,
): string[] {
  const start = Math.max(0, Math.min(EVENT_GRID_MAX_SLOT_INDEX, startSlotIdx));
  const end = Math.max(start, Math.min(EVENT_GRID_MAX_SLOT_INDEX, endSlotIdx));
  const slots: string[] = [];
  for (let slotIdx = start; slotIdx <= end; slotIdx += 1) {
    slots.push(slotIndexToTimeLabel(slotIdx));
  }
  return slots;
}

export function getVisibleSlotRange(options?: {
  earliestTime?: string;
  latestTime?: string;
  padSlots?: number;
}): { startSlotIdx: number; endSlotIdx: number } {
  const padSlots = options?.padSlots ?? 4;
  const earliestIdx = timeLabelToSlotIndex(options?.earliestTime || EVENT_GRID_DEFAULT_START);
  const latestIdxExclusive = timeLabelToSlotIndex(options?.latestTime || EVENT_GRID_DEFAULT_END);

  const baseStart = earliestIdx ?? timeLabelToSlotIndex(EVENT_GRID_DEFAULT_START) ?? 0;
  const baseEndExclusive =
    latestIdxExclusive ?? (timeLabelToSlotIndex(EVENT_GRID_DEFAULT_END) ?? 16);

  const startSlotIdx = Math.max(0, baseStart - padSlots);
  const endSlotIdx = Math.min(
    EVENT_GRID_MAX_SLOT_INDEX,
    Math.max(startSlotIdx, baseEndExclusive + padSlots - 1),
  );

  return { startSlotIdx, endSlotIdx };
}

export const EVENT_GRID_TIME_COLUMN_PX = 76;
/** Fixed pixel width per day column (When2Meet-style density). */
export const EVENT_GRID_DAY_COLUMN_PX = 44;
/** Row height for each 30-minute slot (When2Meet-style density). */
export const EVENT_GRID_SLOT_HEIGHT_PX = 15;
