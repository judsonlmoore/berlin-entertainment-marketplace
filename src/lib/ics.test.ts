import { describe, expect, it } from "vitest";
import {
  assertSafeFeedUrl,
  buildBookingExportIcs,
  parseIcsBusyBlocks,
} from "./ics";

describe("ics helpers", () => {
  it("parses VEVENT busy blocks without requiring titles", () => {
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:abc-123
DTSTART:20260810T160000Z
DTEND:20260810T180000Z
SUMMARY:Secret personal title
END:VEVENT
BEGIN:VEVENT
UID:all-day-1
DTSTART:20260811
DTEND:20260812
END:VEVENT
END:VCALENDAR`;

    const blocks = parseIcsBusyBlocks(ics);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]?.uid).toBe("abc-123");
    expect(blocks[0]?.startsAt.toISOString()).toBe("2026-08-10T16:00:00.000Z");
    expect(blocks[1]?.allDay).toBe(true);
  });

  it("builds export ICS with booking summaries and escapes text", () => {
    const ics = buildBookingExportIcs({
      calendarName: "Salon; test",
      events: [
        {
          uid: "booking-1@salon",
          summary: "Confirmed booking",
          startsAt: new Date("2026-08-10T16:00:00.000Z"),
          endsAt: new Date("2026-08-10T18:00:00.000Z"),
        },
        {
          uid: "booking-2@salon",
          summary: "Requested booking",
          startsAt: new Date("2026-08-11T16:00:00.000Z"),
          endsAt: new Date("2026-08-11T18:00:00.000Z"),
        },
      ],
    });
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("SUMMARY:Confirmed booking");
    expect(ics).toContain("SUMMARY:Requested booking");
    expect(ics).toContain("X-WR-CALNAME:Salon\\; test");
    expect(ics).not.toContain("deposit");
  });

  it("rejects private/local feed hosts", async () => {
    await expect(
      assertSafeFeedUrl("http://localhost/feed.ics"),
    ).rejects.toThrow(/not allowed/i);
    await expect(
      assertSafeFeedUrl("https://127.0.0.1/feed.ics"),
    ).rejects.toThrow(/not allowed|private/i);
  });
});
