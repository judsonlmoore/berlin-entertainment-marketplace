import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { AppError } from "@/src/domain/errors";

const MAX_FEED_BYTES = 2_000_000;
const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 10_000;

function isPrivateOrLocalIp(ip: string): boolean {
  if (ip === "127.0.0.1" || ip === "::1" || ip === "0.0.0.0") return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (ip.startsWith("169.254.")) return true;
  if (ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80")) {
    return true;
  }
  const parts = ip.split(".").map(Number);
  if (parts.length === 4 && parts[0] === 172) {
    const second = parts[1] ?? 0;
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

export async function assertSafeFeedUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new AppError("validation", "Enter a valid calendar feed URL.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new AppError(
      "validation",
      "Calendar feeds must use http or https.",
    );
  }
  if (url.username || url.password) {
    throw new AppError(
      "validation",
      "Calendar feed URLs cannot include usernames or passwords.",
    );
  }
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    throw new AppError(
      "validation",
      "That feed host is not allowed. Use a public https calendar URL — not localhost, and not this app’s own export link on your machine.",
    );
  }

  if (isIP(host)) {
    if (isPrivateOrLocalIp(host)) {
      throw new AppError(
        "validation",
        "That feed host is not allowed. Private or local network addresses can’t be imported.",
      );
    }
  } else {
    const records = await lookup(host, { all: true });
    for (const record of records) {
      if (isPrivateOrLocalIp(record.address)) {
        throw new AppError(
          "validation",
          "That feed host is not allowed. It resolves to a private network address.",
        );
      }
    }
  }
  return url;
}

export type BusyBlock = {
  uid: string;
  startsAt: Date;
  endsAt: Date;
  allDay: boolean;
};

/**
 * Fetch an iCalendar feed with SSRF guards, redirect/size limits.
 * Parses VEVENT start/end only — titles/attendees are discarded.
 */
export async function fetchIcsBusyBlocks(
  feedUrl: string,
): Promise<BusyBlock[]> {
  let current = await assertSafeFeedUrl(feedUrl);
  let body = "";

  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(current.toString(), {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: { Accept: "text/calendar, text/plain, */*" },
      });

      if (
        [301, 302, 303, 307, 308].includes(response.status) &&
        response.headers.get("location")
      ) {
        const next = new URL(
          response.headers.get("location")!,
          current,
        ).toString();
        current = await assertSafeFeedUrl(next);
        continue;
      }

      if (!response.ok) {
        throw new AppError(
          "validation",
          `Calendar feed request failed (${response.status}).`,
        );
      }

      const text = await response.text();
      if (text.length > MAX_FEED_BYTES) {
        throw new AppError(
          "validation",
          "Calendar feed is too large to import.",
        );
      }
      body = text;
      break;
    } finally {
      clearTimeout(timer);
    }
  }

  if (!body) {
    throw new AppError(
      "validation",
      "Calendar feed could not be fetched after redirects.",
    );
  }

  return parseIcsBusyBlocks(body);
}

/** Minimal ICS parser: VEVENT DTSTART/DTEND/UID only. */
export function parseIcsBusyBlocks(ics: string): BusyBlock[] {
  const unfolded = ics.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
  const events = unfolded.split("BEGIN:VEVENT");
  const blocks: BusyBlock[] = [];

  for (let i = 1; i < events.length; i += 1) {
    const chunk = events[i]?.split("END:VEVENT")[0] ?? "";
    const uid = matchProp(chunk, "UID") ?? `anon-${i}`;
    const dtStart = matchProp(chunk, "DTSTART");
    const dtEnd = matchProp(chunk, "DTEND");
    if (!dtStart) continue;

    const start = parseIcsDate(dtStart);
    const end = dtEnd
      ? parseIcsDate(dtEnd)
      : {
          date: new Date(start.date.getTime() + 60 * 60 * 1000),
          allDay: start.allDay,
        };

    if (end.date.getTime() <= start.date.getTime()) continue;

    blocks.push({
      uid,
      startsAt: start.date,
      endsAt: end.date,
      allDay: start.allDay,
    });
  }

  return blocks;
}

function matchProp(chunk: string, name: string): string | null {
  const re = new RegExp(`^${name}[^:]*:(.+)$`, "im");
  const match = re.exec(chunk);
  return match?.[1]?.trim() ?? null;
}

function parseIcsDate(value: string): { date: Date; allDay: boolean } {
  // DATE: 20260115
  if (/^\d{8}$/.test(value)) {
    const y = Number(value.slice(0, 4));
    const m = Number(value.slice(4, 6));
    const d = Number(value.slice(6, 8));
    return {
      date: new Date(Date.UTC(y, m - 1, d)),
      allDay: true,
    };
  }
  // DATETIME UTC: 20260115T180000Z
  if (/^\d{8}T\d{6}Z$/.test(value)) {
    const y = value.slice(0, 4);
    const m = value.slice(4, 6);
    const d = value.slice(6, 8);
    const hh = value.slice(9, 11);
    const mm = value.slice(11, 13);
    const ss = value.slice(13, 15);
    return {
      date: new Date(`${y}-${m}-${d}T${hh}:${mm}:${ss}.000Z`),
      allDay: false,
    };
  }
  // Floating / with TZID — treat as UTC for busy overlay safety.
  if (/^\d{8}T\d{6}$/.test(value)) {
    const y = value.slice(0, 4);
    const m = value.slice(4, 6);
    const d = value.slice(6, 8);
    const hh = value.slice(9, 11);
    const mm = value.slice(11, 13);
    const ss = value.slice(13, 15);
    return {
      date: new Date(`${y}-${m}-${d}T${hh}:${mm}:${ss}.000Z`),
      allDay: false,
    };
  }
  const fallback = new Date(value);
  if (Number.isNaN(fallback.getTime())) {
    throw new Error(`Unrecognized ICS date: ${value}`);
  }
  return { date: fallback, allDay: false };
}

/** Build a minimal ICS calendar of Salon booking blocks for export. */
export function buildBookingExportIcs(input: {
  calendarName: string;
  events: Array<{
    uid: string;
    summary: string;
    startsAt: Date;
    endsAt: Date;
  }>;
}): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Salon//Calendar Export//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(input.calendarName)}`,
  ];

  for (const event of input.events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}`,
      `DTSTAMP:${formatIcsUtc(new Date())}`,
      `DTSTART:${formatIcsUtc(event.startsAt)}`,
      `DTEND:${formatIcsUtc(event.endsAt)}`,
      `SUMMARY:${escapeIcsText(event.summary)}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

/** @deprecated Use buildBookingExportIcs */
export const buildConfirmedBookingsIcs = buildBookingExportIcs;

function formatIcsUtc(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}
