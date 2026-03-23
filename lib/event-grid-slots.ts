/**
 * Default event poll grid: 30-minute steps from 9:00 through 17:00 (inclusive),
 * matching `lib/parse-availability` slot indices (base 9:00 AM).
 */
export function defaultEventTimeSlotLabels(): string[] {
  const slots: string[] = [];
  for (let h = 9; h <= 17; h++) {
    slots.push(`${h}:00`);
    if (h < 17) slots.push(`${h}:30`);
  }
  return slots;
}

export const EVENT_GRID_TIME_COLUMN_PX = 76;
export const EVENT_GRID_DAY_COLUMN_PX = 44;
export const EVENT_GRID_SLOT_HEIGHT_PX = 18;
