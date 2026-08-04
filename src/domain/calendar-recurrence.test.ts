import { describe, expect, it } from "vitest";
import {
  buildManualRRule,
  expandRecurringOccurrences,
  parseStoredRRule,
} from "./calendar-recurrence";
import { parseDatetimeLocalInTimeZone } from "@/src/lib/format";

describe("calendar recurrence", () => {
  it("builds daily/weekly/monthly rules with count or until", () => {
    const dtstart = new Date("2026-03-01T17:00:00.000Z");
    const daily = buildManualRRule(dtstart, { frequency: "daily", count: 3 });
    expect(daily).toContain("FREQ=DAILY");
    expect(daily).toContain("COUNT=3");

    const weekly = buildManualRRule(dtstart, {
      frequency: "weekly",
      count: 4,
    });
    expect(weekly).toContain("FREQ=WEEKLY");

    const monthly = buildManualRRule(dtstart, {
      frequency: "monthly",
      until: new Date("2026-06-01T00:00:00.000Z"),
    });
    expect(monthly).toContain("FREQ=MONTHLY");
    expect(monthly).toContain("UNTIL=");
  });

  it("expands weekly occurrences and respects EXDATE", () => {
    const startsAt = parseDatetimeLocalInTimeZone("2026-01-05T19:00");
    const endsAt = parseDatetimeLocalInTimeZone("2026-01-05T21:00");
    const rule = buildManualRRule(startsAt, { frequency: "weekly", count: 4 });
    const second = parseDatetimeLocalInTimeZone("2026-01-12T19:00");

    const all = expandRecurringOccurrences({
      startsAt,
      endsAt,
      recurrenceRule: rule,
      rangeStart: parseDatetimeLocalInTimeZone("2026-01-01T00:00"),
      rangeEnd: parseDatetimeLocalInTimeZone("2026-02-01T00:00"),
    });
    expect(all).toHaveLength(4);

    const filtered = expandRecurringOccurrences({
      startsAt,
      endsAt,
      recurrenceRule: rule,
      rangeStart: parseDatetimeLocalInTimeZone("2026-01-01T00:00"),
      rangeEnd: parseDatetimeLocalInTimeZone("2026-02-01T00:00"),
      exdates: [second],
    });
    expect(filtered).toHaveLength(3);
    expect(filtered.map((o) => o.startsAt.toISOString())).not.toContain(
      second.toISOString(),
    );
  });

  it("keeps Europe/Berlin wall time across spring DST transition", () => {
    const startBerlin = parseDatetimeLocalInTimeZone("2026-03-28T18:00");
    const endBerlin = parseDatetimeLocalInTimeZone("2026-03-28T20:00");
    const rule = buildManualRRule(startBerlin, {
      frequency: "daily",
      count: 3,
    });

    const occurrences = expandRecurringOccurrences({
      startsAt: startBerlin,
      endsAt: endBerlin,
      recurrenceRule: rule,
      rangeStart: parseDatetimeLocalInTimeZone("2026-03-28T00:00"),
      rangeEnd: parseDatetimeLocalInTimeZone("2026-03-31T00:00"),
    });

    expect(occurrences).toHaveLength(3);

    const berlinHour = (d: Date) =>
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Berlin",
        hour: "2-digit",
        hourCycle: "h23",
      }).format(d);

    for (const occ of occurrences) {
      expect(berlinHour(occ.startsAt)).toBe("18");
      expect(berlinHour(occ.endsAt)).toBe("20");
    }

    expect(occurrences[0]?.startsAt.toISOString()).toBe(
      "2026-03-28T17:00:00.000Z",
    );
    expect(occurrences[1]?.startsAt.toISOString()).toBe(
      "2026-03-29T16:00:00.000Z",
    );
  });

  it("keeps Europe/Berlin wall time across autumn DST transition", () => {
    const startBerlin = parseDatetimeLocalInTimeZone("2026-10-24T18:00");
    const endBerlin = parseDatetimeLocalInTimeZone("2026-10-24T20:00");
    const rule = buildManualRRule(startBerlin, {
      frequency: "daily",
      count: 3,
    });

    const occurrences = expandRecurringOccurrences({
      startsAt: startBerlin,
      endsAt: endBerlin,
      recurrenceRule: rule,
      rangeStart: parseDatetimeLocalInTimeZone("2026-10-24T00:00"),
      rangeEnd: parseDatetimeLocalInTimeZone("2026-10-27T00:00"),
    });

    expect(occurrences).toHaveLength(3);

    const berlinHour = (d: Date) =>
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Berlin",
        hour: "2-digit",
        hourCycle: "h23",
      }).format(d);

    for (const occ of occurrences) {
      expect(berlinHour(occ.startsAt)).toBe("18");
    }
  });

  it("parses stored RRULE text", () => {
    const dtstart = new Date("2026-05-01T10:00:00.000Z");
    const text = buildManualRRule(dtstart, { frequency: "weekly", count: 2 });
    const parsed = parseStoredRRule(text);
    expect(parsed.frequency).toBe("weekly");
    expect(parsed.count).toBe(2);
  });
});
