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
