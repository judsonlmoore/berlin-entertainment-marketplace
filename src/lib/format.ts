const BERLIN_TZ = "Europe/Berlin";

/** Format integer euro cents for marketplace UI. */
export function formatEur(cents: number, locale: string) {
  return new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/**
 * Format an instant as `datetime-local` wall time in Europe/Berlin.
 * Avoids host/browser timezone drift in server-rendered defaults.
 */
export function toDatetimeLocal(date: Date, timeZone: string = BERLIN_TZ) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** Calendar date `YYYY-MM-DD` in the given timezone (default Europe/Berlin). */
export function toDateInput(date: Date, timeZone: string = BERLIN_TZ) {
  return toDatetimeLocal(date, timeZone).slice(0, 10);
}

function parseLocalParts(datetimeLocal: string): {
  year: number;
  monthIndex: number;
  day: number;
  hour: number;
  minute: number;
} | null {
  // Expected: YYYY-MM-DDTHH:mm
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(datetimeLocal);
  if (!match) return null;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(monthIndex) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return null;
  }

  return { year, monthIndex, day, hour, minute };
}

/**
 * Parse a `datetime-local` wall-time string as a real instant in `timeZone`.
 * This avoids host/browser timezone drift by correcting the offset using Intl.
 */
export function parseDatetimeLocalInTimeZone(
  datetimeLocal: string,
  timeZone: string = BERLIN_TZ,
): Date {
  const parts = parseLocalParts(datetimeLocal);
  if (!parts) {
    throw new Error("Invalid datetime-local format");
  }

  const desiredWallAsUTC = Date.UTC(
    parts.year,
    parts.monthIndex,
    parts.day,
    parts.hour,
    parts.minute,
  );

  // Start with the naive interpretation.
  let guessUTCms = desiredWallAsUTC;

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  for (let i = 0; i < 3; i += 1) {
    const guessDate = new Date(guessUTCms);
    const formattedParts = formatter.formatToParts(guessDate);

    const get = (type: Intl.DateTimeFormatPartTypes) =>
      formattedParts.find((p) => p.type === type)?.value;

    const wallYear = Number(get("year"));
    const wallMonthIndex = Number(get("month")) - 1;
    const wallDay = Number(get("day"));
    const wallHour = Number(get("hour"));
    const wallMinute = Number(get("minute"));

    const formattedWallAsUTC = Date.UTC(
      wallYear,
      wallMonthIndex,
      wallDay,
      wallHour,
      wallMinute,
    );

    const deltaMs = formattedWallAsUTC - desiredWallAsUTC;
    if (deltaMs === 0) break;

    // Move the guess until the formatted wall time matches the desired wall time.
    guessUTCms -= deltaMs;
  }

  return new Date(guessUTCms);
}

export function parseDateInTimeZone(
  date: string, // YYYY-MM-DD
  timeZone: string = BERLIN_TZ,
): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error("Invalid date format");
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);

  // Compose a datetime-local at 00:00 in the target zone.
  return parseDatetimeLocalInTimeZone(
    `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(
      2,
      "0",
    )}T00:00`,
    timeZone,
  );
}
