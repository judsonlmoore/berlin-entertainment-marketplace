export const CALENDAR_ENTRY_STATES = [
  "available",
  "unavailable",
  "tentative_hold",
  "requested",
  "confirmed",
] as const;

export type CalendarEntryState = (typeof CALENDAR_ENTRY_STATES)[number];

export const MANUAL_CALENDAR_STATES = [
  "available",
  "unavailable",
  "tentative_hold",
] as const satisfies readonly CalendarEntryState[];

export type CalendarOwnerType = "entertainer" | "venue_space";

/** Expired holds no longer block other bookings. */
export function isHoldBlocking(
  state: CalendarEntryState,
  holdExpiresAt: Date | null,
  now: Date = new Date(),
): boolean {
  if (state !== "tentative_hold") return false;
  if (!holdExpiresAt) return true;
  return holdExpiresAt.getTime() > now.getTime();
}

export function isBlockingCalendarState(
  state: CalendarEntryState,
  holdExpiresAt: Date | null,
  now: Date = new Date(),
): boolean {
  if (
    state === "confirmed" ||
    state === "requested" ||
    state === "unavailable"
  ) {
    return true;
  }
  return isHoldBlocking(state, holdExpiresAt, now);
}

export function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

export function canManuallySetCalendarState(
  state: CalendarEntryState,
): boolean {
  return (MANUAL_CALENDAR_STATES as readonly string[]).includes(state);
}

export function requiresHoldExpiry(state: CalendarEntryState): boolean {
  return state === "tentative_hold";
}

export function isExpiredHold(
  state: CalendarEntryState,
  holdExpiresAt: Date | null,
  now: Date = new Date(),
): boolean {
  return (
    state === "tentative_hold" &&
    holdExpiresAt !== null &&
    holdExpiresAt.getTime() <= now.getTime()
  );
}
