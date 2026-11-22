// GENERATED from /shared/src — do not edit here. Run: node scripts/sync-shared.mjs

// Shift and stay-day helpers. All "clock" logic uses the device's local time,
// so call these in the apps, not on the server (which runs in UTC).

export type ShiftType = 'DAY' | 'NIGHT';

export const DAY_SHIFT_START_HOUR = 8;
export const NIGHT_SHIFT_START_HOUR = 20;

export interface TimeWindow {
  start: Date;
  end: Date;
}

export interface ShiftWindow extends TimeWindow {
  type: ShiftType;
}

// The 12-hour shift that contains `at`: Day 08:00–20:00, Night 20:00–08:00.
export function shiftWindowAt(at: Date): ShiftWindow {
  const start = new Date(at);
  const hour = at.getHours();
  if (hour >= DAY_SHIFT_START_HOUR && hour < NIGHT_SHIFT_START_HOUR) {
    start.setHours(DAY_SHIFT_START_HOUR, 0, 0, 0);
    const end = new Date(start);
    end.setHours(NIGHT_SHIFT_START_HOUR, 0, 0, 0);
    return { type: 'DAY', start, end };
  }
  if (hour < DAY_SHIFT_START_HOUR) start.setDate(start.getDate() - 1);
  start.setHours(NIGHT_SHIFT_START_HOUR, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  end.setHours(DAY_SHIFT_START_HOUR, 0, 0, 0);
  return { type: 'NIGHT', start, end };
}

// The shift immediately before the given one.
export function previousShiftWindow(shift: ShiftWindow): ShiftWindow {
  return shiftWindowAt(new Date(shift.start.getTime() - 60_000));
}

// The fluid-chart day: 08:00 to 08:00, starting with the day shift.
export function chartDayWindow(at: Date): TimeWindow {
  const start = new Date(at);
  if (at.getHours() < DAY_SHIFT_START_HOUR) start.setDate(start.getDate() - 1);
  start.setHours(DAY_SHIFT_START_HOUR, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

// Day of ICU stay: the admission day is day 1.
export function dayOfStay(admittedAt: string | Date | null | undefined, now: Date = new Date()): number {
  if (!admittedAt) return 1;
  const admitted = new Date(admittedAt).getTime();
  if (isNaN(admitted)) return 1;
  return Math.max(1, Math.floor((now.getTime() - admitted) / (24 * 60 * 60_000)) + 1);
}

// Whole days a device or drug has been in place: the first 24 hours are day 1.
export function dayCount(since: string | Date | null | undefined, until: Date = new Date()): number {
  return dayOfStay(since, until);
}

// Age in completed years.
export function ageYears(dob: string | Date | null | undefined, now: Date = new Date()): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  let age = now.getFullYear() - birth.getFullYear();
  const beforeBirthday = now.getMonth() < birth.getMonth()
    || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 ? age : null;
}
