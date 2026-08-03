import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarEntryForm } from "@/src/components/calendar-entry-form";
import { DeleteCalendarEntryButton } from "@/src/components/calendar-entry-actions";
import { PageHeader } from "@/src/components/ui/page-header";
import { StatusLabel } from "@/src/components/ui/status-label";
import { requireDiscoveryAccess } from "@/src/db/queries/discovery-access";
import {
  ensureDefaultVenueSpace,
  listCalendarEntriesInRange,
  listCalendarResourcesForUser,
} from "@/src/db/queries/calendar";
import { expireStaleHolds } from "@/src/db/queries/calendar-ops";
import { isHoldBlocking } from "@/src/domain/calendar";
import { can } from "@/src/domain/permissions";
import { Link } from "@/src/i18n/navigation";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function monthBounds(year: number, monthIndex: number) {
  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0));
  return { start, end };
}

function toDatetimeLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function stateTone(
  state: string,
): "neutral" | "success" | "warning" | "info" | "danger" {
  if (state === "confirmed") return "success";
  if (state === "requested") return "info";
  if (state === "tentative_hold") return "warning";
  if (state === "unavailable") return "danger";
  return "neutral";
}

export default async function CalendarPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("calendar");
  const market = await getTranslations("marketplace");
  const access = await requireDiscoveryAccess();

  if (!access.ok || !can(access.actor, "calendar.manage")) {
    return (
      <section className="mx-auto max-w-xl">
        <PageHeader title={t("title")} body={market("denied")} />
      </section>
    );
  }

  const query = await searchParams;
  const now = new Date();
  await expireStaleHolds({ now });
  const year = Number(first(query.year)) || now.getFullYear();
  const month = Number(first(query.month));
  const monthIndex =
    Number.isFinite(month) && month >= 1 && month <= 12
      ? month - 1
      : now.getMonth();

  const resourcesData = await listCalendarResourcesForUser(access.actor.userId);
  for (const venue of resourcesData.venuesNeedingSpace) {
    await ensureDefaultVenueSpace(venue.venueId, venue.venueName);
  }
  const refreshed = await listCalendarResourcesForUser(access.actor.userId);

  const resources = [
    ...(refreshed.entertainer
      ? [
          {
            key: `entertainer:${refreshed.entertainer.id}`,
            ownerType: "entertainer" as const,
            ownerId: refreshed.entertainer.id,
            label: `${t("actResource")}: ${refreshed.entertainer.name}`,
          },
        ]
      : []),
    ...refreshed.spaces.map((space) => ({
      key: `venue_space:${space.spaceId}`,
      ownerType: "venue_space" as const,
      ownerId: space.spaceId,
      label: `${space.venueName} · ${space.spaceName}`,
    })),
  ];

  const selectedKey =
    first(query.resource) &&
    resources.some((item) => item.key === first(query.resource))
      ? String(first(query.resource))
      : resources[0]?.key;

  const selected = resources.find((item) => item.key === selectedKey) ?? null;
  const { start, end } = monthBounds(year, monthIndex);
  const entries = selected
    ? await listCalendarEntriesInRange({
        ownerType: selected.ownerType,
        ownerId: selected.ownerId,
        rangeStart: start,
        rangeEnd: end,
      })
    : [];

  const monthLabel = new Intl.DateTimeFormat(
    locale === "de" ? "de-DE" : "en-GB",
    { month: "long", year: "numeric", timeZone: "UTC" },
  ).format(start);

  const prevMonth = monthIndex === 0 ? 12 : monthIndex;
  const prevYear = monthIndex === 0 ? year - 1 : year;
  const nextMonth = monthIndex === 11 ? 1 : monthIndex + 2;
  const nextYear = monthIndex === 11 ? year + 1 : year;

  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const startWeekday = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  // Monday-first
  const pad = (startWeekday + 6) % 7;

  const dateFmt = new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  });

  const defaultStart = new Date(now);
  defaultStart.setDate(defaultStart.getDate() + 1);
  defaultStart.setHours(18, 0, 0, 0);
  const defaultEnd = new Date(defaultStart);
  defaultEnd.setHours(20, 0, 0, 0);

  const weekdayLabels =
    locale === "de"
      ? ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]
      : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <section className="grid gap-8">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        body={t("body")}
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/marketplace/calendar?year=${prevYear}&month=${prevMonth}${selectedKey ? `&resource=${encodeURIComponent(selectedKey)}` : ""}`}
              className="inline-flex min-h-11 items-center border border-[var(--rule)] bg-[var(--surface)] px-3 text-sm no-underline"
            >
              ←
            </Link>
            <Link
              href={`/marketplace/calendar?year=${now.getFullYear()}&month=${now.getMonth() + 1}${selectedKey ? `&resource=${encodeURIComponent(selectedKey)}` : ""}`}
              className="inline-flex min-h-11 items-center border border-[var(--rule)] bg-[var(--surface)] px-3 text-sm no-underline"
            >
              {t("today")}
            </Link>
            <Link
              href={`/marketplace/calendar?year=${nextYear}&month=${nextMonth}${selectedKey ? `&resource=${encodeURIComponent(selectedKey)}` : ""}`}
              className="inline-flex min-h-11 items-center border border-[var(--rule)] bg-[var(--surface)] px-3 text-sm no-underline"
            >
              →
            </Link>
          </div>
        }
      />

      <form method="get" className="panel flex flex-wrap items-end gap-3 p-4">
        <input type="hidden" name="year" value={year} />
        <input type="hidden" name="month" value={monthIndex + 1} />
        <label className="label min-w-[16rem] flex-1">
          <span>{t("resource")}</span>
          <select
            name="resource"
            className="field"
            defaultValue={selectedKey ?? ""}
          >
            {resources.map((resource) => (
              <option key={resource.key} value={resource.key}>
                {resource.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="inline-flex min-h-11 items-center bg-[var(--primary)] px-4 text-sm text-[var(--primary-foreground)]"
        >
          {t("switchResource")}
        </button>
      </form>

      <p className="display text-3xl">{monthLabel}</p>

      <div className="flex flex-wrap gap-2 text-xs">
        {(
          [
            ["available", t("stateAvailable")],
            ["unavailable", t("stateUnavailable")],
            ["tentative_hold", t("stateHold")],
            ["requested", t("stateRequested")],
            ["confirmed", t("stateConfirmed")],
          ] as const
        ).map(([state, label]) => (
          <StatusLabel key={state} tone={stateTone(state)}>
            {label}
          </StatusLabel>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <div className="grid min-w-[720px] grid-cols-7 gap-px border border-[var(--rule)] bg-[var(--rule)]">
          {weekdayLabels.map((day) => (
            <div
              key={day}
              className="bg-[var(--surface)] px-2 py-2 text-center text-xs font-semibold tracking-[0.12em] uppercase"
            >
              {day}
            </div>
          ))}
          {Array.from({ length: pad }).map((_, index) => (
            <div key={`pad-${index}`} className="min-h-28 bg-[var(--canvas)]" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1;
            const dayStart = new Date(Date.UTC(year, monthIndex, day));
            const dayEnd = new Date(Date.UTC(year, monthIndex, day + 1));
            const dayEntries = entries.filter(
              (entry) => entry.startsAt < dayEnd && entry.endsAt > dayStart,
            );
            return (
              <div
                key={day}
                className="min-h-28 bg-[var(--surface)] p-2 text-sm"
              >
                <p className="tabular font-semibold">{day}</p>
                <ul className="mt-2 grid gap-1">
                  {dayEntries.slice(0, 3).map((entry) => {
                    const expired =
                      entry.state === "tentative_hold" &&
                      !isHoldBlocking(entry.state, entry.holdExpiresAt);
                    return (
                      <li
                        key={entry.id}
                        className="truncate text-[0.65rem] text-[var(--text-muted)]"
                      >
                        {expired ? t("holdExpired") : entry.state}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 md:hidden">
        <h2 className="text-sm font-semibold tracking-[0.12em] uppercase">
          {t("agendaTitle")}
        </h2>
        {entries.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">{t("empty")}</p>
        ) : (
          <ul className="grid gap-2">
            {entries.map((entry) => (
              <li key={entry.id} className="panel grid gap-2 p-3 text-sm">
                <StatusLabel tone={stateTone(entry.state)}>
                  {entry.state}
                </StatusLabel>
                <p>
                  {dateFmt.format(entry.startsAt)} –{" "}
                  {dateFmt.format(entry.endsAt)}
                </p>
                {entry.state === "tentative_hold" && entry.holdExpiresAt ? (
                  <p className="text-[var(--text-muted)]">
                    {t("holdExpiresAt")}: {dateFmt.format(entry.holdExpiresAt)}
                    {!isHoldBlocking(entry.state, entry.holdExpiresAt)
                      ? ` (${t("holdExpired")})`
                      : ""}
                  </p>
                ) : null}
                {entry.state !== "confirmed" && entry.state !== "requested" ? (
                  <DeleteCalendarEntryButton
                    locale={locale as "en" | "de"}
                    entryId={entry.id}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="panel hidden gap-3 p-4 md:grid">
        <h2 className="text-sm font-semibold tracking-[0.12em] uppercase">
          {t("entriesTitle")}
        </h2>
        {entries.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">{t("empty")}</p>
        ) : (
          <ul className="grid gap-2">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-3 border border-[var(--rule)] p-3 text-sm"
              >
                <div>
                  <StatusLabel tone={stateTone(entry.state)}>
                    {entry.state}
                  </StatusLabel>
                  <p className="mt-2">
                    {dateFmt.format(entry.startsAt)} –{" "}
                    {dateFmt.format(entry.endsAt)}
                  </p>
                </div>
                {entry.state !== "confirmed" && entry.state !== "requested" ? (
                  <DeleteCalendarEntryButton
                    locale={locale as "en" | "de"}
                    entryId={entry.id}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="panel p-6">
        <CalendarEntryForm
          locale={locale as "en" | "de"}
          resources={resources}
          defaultStartsAt={toDatetimeLocal(defaultStart)}
          defaultEndsAt={toDatetimeLocal(defaultEnd)}
        />
      </div>
    </section>
  );
}
