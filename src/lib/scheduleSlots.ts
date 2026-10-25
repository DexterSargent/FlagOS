export interface ScheduleSlot {
  dayOffset: number;
  time: string;
  location: string;
}

export interface SlotAssignment {
  /** One entry per requested game; null when no free slot was left. */
  slots: Array<ScheduleSlot | null>;
  capacity: number;
}

/**
 * Assigns games to unique (day, time, field) slots so a field never hosts two
 * games at once. Slots fill every field at the earliest kickoff before moving on
 * to the next kickoff, then to the next game day. Games beyond capacity get null
 * so callers can report them instead of double-booking.
 */
export function assignScheduleSlots(
  gameCount: number,
  fields: string[],
  times: string[],
  dayOffsets: number[] = [0],
): SlotAssignment {
  const fieldList = fields.length > 0 ? fields : ["Field 1"];
  const timeList = times.length > 0 ? times : ["10:00 AM"];
  const days = dayOffsets.length > 0 ? dayOffsets : [0];
  const all: ScheduleSlot[] = [];
  for (const dayOffset of days) {
    for (const time of timeList) {
      for (const location of fieldList) {
        all.push({ dayOffset, time, location });
      }
    }
  }
  const slots = Array.from({ length: gameCount }, (_, i) => all[i] ?? null);
  return { slots, capacity: all.length };
}

export function scheduleDayOffsets(gameDays: "saturdays" | "sundays" | "weekends"): number[] {
  return gameDays === "weekends" ? [0, 1] : [0];
}
