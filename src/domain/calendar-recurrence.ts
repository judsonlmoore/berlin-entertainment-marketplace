import { RRule, Frequency } from "rrule";
import {
  parseDatetimeLocalInTimeZone,
  toDatetimeLocal,
} from "@/src/lib/format";

export type RecurrenceFrequency = "daily" | "weekly" | "monthly";

export type ManualRecurrenceInput = {
  frequency: RecurrenceFrequency;
  /** Inclusive end (last occurrence must start on or before this instant). */
  until?: Date;
  /** Max occurrences including DTSTART. */
  count?: number;
};

const FREQ_MAP: Record<RecurrenceFrequency, Frequency> = {
  daily: RRule.DAILY,
  weekly: RRule.WEEKLY,
  monthly: RRule.MONTHLY,
};

/** Cap for conflict checks / listing expansion. */
export const MAX_RECURRENCE_OCCURRENCES = 366;

const BERLIN = "Europe/Berlin";

/**
 * Build a portable RRULE string (FREQ + COUNT or UNTIL) for storage.
 * Expansion is Berlin-wall-time aware and does not rely on RRule.between alone.
 */
export function buildManualRRule(
  dtstart: Date,
  input: ManualRecurrenceInput,
): string {
  if (!input.until && !input.count) {
    throw new Error("Recurrence requires until or count");
  }
  if (input.until && input.count) {
    throw new Error("Recurrence accepts until or count, not both");
  }

  const rule = new RRule({
    freq: FREQ_MAP[input.frequency],
    dtstart,
    ...(input.until ? { until: input.until } : {}),
    ...(input.count ? { count: input.count } : {}),
  });
  return rule.toString();
}

export function parseStoredRRule(rruleText: string): {
  frequency: RecurrenceFrequency;
  count?: number;
  until?: Date;
} {
  const upper = rruleText.toUpperCase();
  let frequency: RecurrenceFrequency = "weekly";
  if (upper.includes("FREQ=DAILY")) frequency = "daily";
  else if (upper.includes("FREQ=MONTHLY")) frequency = "monthly";
  else if (upper.includes("FREQ=WEEKLY")) frequency = "weekly";
  else {
    throw new Error("Unsupported recurrence frequency");
  }

  const countMatch = /COUNT=(\d+)/i.exec(rruleText);
  const untilMatch = /UNTIL=([0-9T]+Z?)/i.exec(rruleText);

  const result: {
    frequency: RecurrenceFrequency;
    count?: number;
    until?: Date;
  } = { frequency };

  if (countMatch?.[1]) {
    result.count = Number(countMatch[1]);
  }
  if (untilMatch?.[1]) {
    const raw = untilMatch[1];
    // RRULE UNTIL is often YYYYMMDDTHHMMSSZ
    if (/^\d{8}T\d{6}Z$/.test(raw)) {
      const y = raw.slice(0, 4);
      const m = raw.slice(4, 6);
      const d = raw.slice(6, 8);
      const hh = raw.slice(9, 11);
      const mm = raw.slice(11, 13);
      const ss = raw.slice(13, 15);
      result.until = new Date(`${y}-${m}-${d}T${hh}:${mm}:${ss}.000Z`);
    } else {
      result.until = new Date(raw);
    }
  }

  if (result.count === undefined && result.until === undefined) {
    throw new Error("Recurrence requires until or count");
  }
  return result;
}

function berlinParts(date: Date) {
  const local = toDatetimeLocal(date, BERLIN);
  const [ymd, hm] = local.split("T");
  const [y, mo, d] = (ymd ?? "").split("-").map(Number);
  const [h, mi] = (hm ?? "00:00").split(":").map(Number);
  return {
    year: y ?? 1970,
    month: mo ?? 1,
    day: d ?? 1,
    hour: h ?? 0,
    minute: mi ?? 0,
  };
}

function addCalendarMonths(
  year: number,
  month: number,
  day: number,
  months: number,
): { year: number; month: number; day: number } {
  const idx = month - 1 + months;
  const y = year + Math.floor(idx / 12);
  const m = ((idx % 12) + 12) % 12;
  const dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return { year: y, month: m + 1, day: Math.min(day, dim) };
}

function occurrenceAtBerlinWall(
  base: ReturnType<typeof berlinParts>,
  frequency: RecurrenceFrequency,
  index: number,
): Date {
  let year = base.year;
  let month = base.month;
  let day = base.day;

  if (frequency === "daily") {
    const dt = new Date(Date.UTC(year, month - 1, day + index));
    year = dt.getUTCFullYear();
    month = dt.getUTCMonth() + 1;
    day = dt.getUTCDate();
  } else if (frequency === "weekly") {
    const dt = new Date(Date.UTC(year, month - 1, day + index * 7));
    year = dt.getUTCFullYear();
    month = dt.getUTCMonth() + 1;
    day = dt.getUTCDate();
  } else {
    const next = addCalendarMonths(year, month, day, index);
    year = next.year;
    month = next.month;
    day = next.day;
  }

  const local = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(base.hour).padStart(2, "0")}:${String(base.minute).padStart(2, "0")}`;
  return parseDatetimeLocalInTimeZone(local, BERLIN);
}

export type ExpandedOccurrence = {
  startsAt: Date;
  endsAt: Date;
};

/**
 * Expand a parent entry into concrete occurrences overlapping [rangeStart, rangeEnd).
 * Preserves Europe/Berlin wall-clock time across DST transitions.
 */
export function expandRecurringOccurrences(input: {
  startsAt: Date;
  endsAt: Date;
  recurrenceRule: string;
  rangeStart: Date;
  rangeEnd: Date;
  exdates?: Date[];
  maxOccurrences?: number;
}): ExpandedOccurrence[] {
  const durationMs = input.endsAt.getTime() - input.startsAt.getTime();
  if (durationMs <= 0) return [];

  const parsed = parseStoredRRule(input.recurrenceRule);
  const base = berlinParts(input.startsAt);
  const exSet = new Set((input.exdates ?? []).map((d) => d.getTime()));
  const max = input.maxOccurrences ?? MAX_RECURRENCE_OCCURRENCES;

  const out: ExpandedOccurrence[] = [];
  for (let i = 0; i < max; i += 1) {
    if (parsed.count !== undefined && i >= parsed.count) break;

    const startsAt = occurrenceAtBerlinWall(base, parsed.frequency, i);
    if (parsed.until && startsAt.getTime() > parsed.until.getTime()) break;

    const endsAt = new Date(startsAt.getTime() + durationMs);
    if (startsAt.getTime() >= input.rangeEnd.getTime()) break;
    if (endsAt.getTime() <= input.rangeStart.getTime()) continue;
    if (exSet.has(startsAt.getTime())) continue;

    out.push({ startsAt, endsAt });
  }
  return out;
}

export function isValidManualFrequency(
  value: string,
): value is RecurrenceFrequency {
  return value === "daily" || value === "weekly" || value === "monthly";
}
