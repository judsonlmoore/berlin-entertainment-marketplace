import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/src/components/ui/page-header";
import { StatusLabel } from "@/src/components/ui/status-label";
import {
  FullCalendarWorkspace,
  type CalendarWorkspaceEvent,
} from "@/src/components/calendar/fullcalendar-workspace";
import { requireDiscoveryAccess } from "@/src/db/queries/discovery-access";
import {
  listCalendarEntriesInRange,
  listCalendarResourcesForUser,
} from "@/src/db/queries/calendar";
import { ensureCalendarSubscribeUrl } from "@/src/db/queries/calendar-ics";
import { CalendarSubscribePanel } from "@/src/components/calendar/calendar-subscribe-panel";
import { isHoldBlocking } from "@/src/domain/calendar";
import { can } from "@/src/domain/permissions";
import { Link } from "@/src/i18n/navigation";
import { toDateInput } from "@/src/lib/format";
import { calendarEventStyle } from "@/src/lib/calendar-event-style";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

type CalendarViewParam = "month" | "week";

/** Today's calendar date in Europe/Berlin as UTC-midnight of that Y-M-D. */
function berlinTodayUTC(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");
  return new Date(Date.UTC(get("year"), get("month") - 1, get("day")));
}

function parseDateParam(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(monthIndex) ||
    !Number.isFinite(day)
  ) {
    return null;
  }
  return new Date(Date.UTC(year, monthIndex, day));
}

function formatDateParam(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function monthBounds(year: number, monthIndex: number) {
  return {
    start: new Date(Date.UTC(year, monthIndex, 1)),
    end: new Date(Date.UTC(year, monthIndex + 1, 1)),
  };
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

  const viewRaw = first(query.view);
  const view: CalendarViewParam = viewRaw === "week" ? "week" : "month";

  const today = berlinTodayUTC();
  const activeDate = parseDateParam(first(query.date)) ?? today;
  const activeDateStr = formatDateParam(activeDate);
  const year = activeDate.getUTCFullYear();
  const monthIndex = activeDate.getUTCMonth();

  const allStates = [
    "unavailable",
    "tentative_hold",
    "requested",
    "confirmed",
  ] as const;
  const allStatesSet = new Set<string>(allStates);
  const showParam = query.show;
  const showValues = Array.isArray(showParam)
    ? showParam
    : showParam
      ? [showParam]
      : [];
  const visibleStates =
    showValues.length > 0
      ? new Set(showValues.filter((s) => allStatesSet.has(s)))
      : new Set<string>(allStates);
  const showQuery =
    visibleStates.size === allStates.length
      ? ""
      : visibleStates.size === 0
        ? "&show=_"
        : Array.from(visibleStates)
            .map((s) => `&show=${encodeURIComponent(s)}`)
            .join("");

  const refreshed = await listCalendarResourcesForUser(access.actor.userId);

  const resources = [
    ...(refreshed.entertainer
      ? [
          {
            key: `entertainer:${refreshed.entertainer.id}`,
            ownerType: "entertainer" as const,
            ownerId: refreshed.entertainer.id,
            label: refreshed.entertainer.name,
            kind: "act" as const,
          },
        ]
      : []),
    ...refreshed.spaces.map((space) => ({
      key: `venue_space:${space.spaceId}`,
      ownerType: "venue_space" as const,
      ownerId: space.spaceId,
      label: `${space.venueName} · ${space.spaceName}`,
      kind: "venue" as const,
    })),
  ];

  // Prefer resource for active role mode; dual-role can still switch explicitly.
  const preferVenue = access.actor.activeRoleMode === "venue";
  const preferredKey =
    (preferVenue
      ? resources.find((r) => r.kind === "venue")?.key
      : resources.find((r) => r.kind === "act")?.key) ??
    resources[0]?.key ??
    "";
  const selectedKey =
    first(query.resource) &&
    resources.some((item) => item.key === first(query.resource))
      ? String(first(query.resource))
      : preferredKey;
  const selected = resources.find((item) => item.key === selectedKey) ?? null;
  const needsScopeSwitcher = resources.length > 1;

  let rangeStart: Date;
  let rangeEnd: Date;
  if (view === "month") {
    const bounds = monthBounds(year, monthIndex);
    // Pad a week on each side so month grid edge days still load.
    rangeStart = addDays(bounds.start, -7);
    rangeEnd = addDays(bounds.end, 7);
  } else {
    const weekday = activeDate.getUTCDay();
    const pad = (weekday + 6) % 7;
    rangeStart = addDays(activeDate, -pad);
    rangeEnd = addDays(rangeStart, 7);
  }

  const entries = selected
    ? await listCalendarEntriesInRange({
        ownerType: selected.ownerType,
        ownerId: selected.ownerId,
        rangeStart,
        rangeEnd,
      })
    : [];

  const monthLabel = new Intl.DateTimeFormat(
    locale === "de" ? "de-DE" : "en-GB",
    { month: "long", year: "numeric", timeZone: "UTC" },
  ).format(new Date(Date.UTC(year, monthIndex, 1)));

  const dateFmt = new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    dateStyle: "medium",
    timeZone: "UTC",
  });

  const pageTitle =
    view === "month"
      ? monthLabel
      : `${dateFmt.format(rangeStart)} – ${dateFmt.format(addDays(rangeEnd, -1))}`;

  const initialView = view === "month" ? "dayGridMonth" : "timeGridWeek";

  const initialDateISO = new Date(
    Date.UTC(year, monthIndex, activeDate.getUTCDate(), 12, 0, 0, 0),
  ).toISOString();

  const resourceQuery = selectedKey
    ? `&resource=${encodeURIComponent(selectedKey)}`
    : "";

  const stateFilters = [
    ["unavailable", t("stateUnavailable")],
    ["tentative_hold", t("stateHold")],
    ["requested", t("stateRequested")],
    ["confirmed", t("stateConfirmed")],
  ] as const;

  const toggleStateHref = (state: (typeof stateFilters)[number][0]) => {
    const next = new Set(visibleStates);
    if (next.has(state)) next.delete(state);
    else next.add(state);
    const nextShow =
      next.size === allStates.length
        ? ""
        : next.size === 0
          ? "&show=_"
          : Array.from(next)
              .map((s) => `&show=${encodeURIComponent(s)}`)
              .join("");
    return `/marketplace/calendar?view=${view}&date=${activeDateStr}${resourceQuery}${nextShow}`;
  };

  let prevDate: Date;
  let nextDate: Date;
  if (view === "month") {
    prevDate = new Date(Date.UTC(year, monthIndex - 1, 1));
    nextDate = new Date(Date.UTC(year, monthIndex + 1, 1));
  } else {
    prevDate = addDays(activeDate, -7);
    nextDate = addDays(activeDate, 7);
  }

  const navHref = (date: Date, nextView = view) =>
    `/marketplace/calendar?view=${nextView}&date=${formatDateParam(date)}${resourceQuery}${showQuery}`;

  const events: CalendarWorkspaceEvent[] = [
    ...entries
      .filter(
        (entry) =>
          entry.state !== "available" && visibleStates.has(entry.state),
      )
      .map((entry) => {
        const expiredHold =
          entry.state === "tentative_hold" &&
          !isHoldBlocking(entry.state, entry.holdExpiresAt);
        const stateLabel =
          entry.state === "unavailable"
            ? t("stateUnavailable")
            : entry.state === "tentative_hold"
              ? t("stateHold")
              : entry.state === "requested"
                ? t("stateRequested")
                : t("stateConfirmed");

        const editable =
          !entry.recurrenceRule &&
          !entry.bookingId &&
          (entry.state === "unavailable" || entry.state === "tentative_hold");

        const style = calendarEventStyle(entry.state);

        return {
          id: entry.occurrenceId ?? entry.id,
          start: entry.allDay
            ? toDateInput(entry.startsAt)
            : entry.startsAt.toISOString(),
          end: entry.allDay
            ? toDateInput(entry.endsAt)
            : entry.endsAt.toISOString(),
          title: entry.title?.trim()
            ? entry.title
            : expiredHold
              ? t("holdExpired")
              : stateLabel,
          allDay: entry.allDay,
          editable,
          color: style.color,
          contrastColor: style.contrastColor,
          className: style.className,
          extendedProps: {
            state: entry.state,
            bookingId: entry.bookingId,
            version: entry.version,
            editable,
            entryTitle: entry.title,
            privateNote: entry.privateNote,
            holdExpiresAt: entry.holdExpiresAt?.toISOString() ?? null,
          },
        };
      }),
  ];

  const subscribeUrl =
    selected && process.env.DATABASE_URL
      ? await ensureCalendarSubscribeUrl({
          ownerType: selected.ownerType,
          ownerId: selected.ownerId,
          createdByUserId: access.actor.userId,
        })
      : null;

  return (
    <section className="grid gap-8">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} body={t("body")} />

      {needsScopeSwitcher ? (
        <div className="flex flex-wrap gap-2">
          {resources.map((resource) => (
            <Link
              key={resource.key}
              href={`/marketplace/calendar?view=${view}&date=${activeDateStr}&resource=${encodeURIComponent(resource.key)}${showQuery}`}
              aria-current={selectedKey === resource.key ? "page" : undefined}
              className={`inline-flex min-h-11 items-center border border-[var(--rule)] px-3 text-sm no-underline ${
                selectedKey === resource.key
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "bg-[var(--surface)]"
              }`}
            >
              {resource.label}
            </Link>
          ))}
        </div>
      ) : null}

      {/* Mobile: 3 full-width rows. Desktop: single inline toolbar. */}
      <div className="grid gap-3 md:hidden">
        <h2 className="page-title tabular min-w-0 text-xl leading-tight break-words">
          {pageTitle}
        </h2>

        <div className="flex w-full items-stretch gap-2">
          <div
            className="grid min-w-0 flex-1 grid-cols-2"
            role="group"
            aria-label={t("viewToggle")}
          >
            {(
              [
                ["month", t("viewMonth")],
                ["week", t("viewWeek")],
              ] as const
            ).map(([value, label], index) => (
              <Link
                key={value}
                href={navHref(activeDate, value)}
                aria-current={view === value ? "page" : undefined}
                className={`inline-flex min-h-11 items-center justify-center border border-[var(--rule)] px-3 text-sm no-underline ${
                  index === 0 ? "rounded-l-md" : "-ml-px rounded-r-md"
                } ${
                  view === value
                    ? "relative z-[1] bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "bg-[var(--surface)]"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="grid min-w-0 flex-1 grid-cols-[2.75rem_1fr_2.75rem] gap-1.5">
            <Link
              href={navHref(prevDate)}
              aria-label={t("prevPeriod")}
              className="inline-flex min-h-11 items-center justify-center border border-[var(--rule)] bg-[var(--surface)] text-sm no-underline"
            >
              ←
            </Link>
            <Link
              href={navHref(today)}
              className="inline-flex min-h-11 items-center justify-center border border-[var(--rule)] bg-[var(--surface)] px-2 text-sm no-underline"
            >
              {t("today")}
            </Link>
            <Link
              href={navHref(nextDate)}
              aria-label={t("nextPeriod")}
              className="inline-flex min-h-11 items-center justify-center border border-[var(--rule)] bg-[var(--surface)] text-sm no-underline"
            >
              →
            </Link>
          </div>
        </div>

        <div
          className="grid w-full grid-cols-2 gap-2"
          role="group"
          aria-label={t("legend")}
        >
          {stateFilters.map(([state, label]) => {
            const active = visibleStates.has(state);
            return (
              <Link
                key={state}
                href={toggleStateHref(state)}
                aria-pressed={active}
                title={
                  active
                    ? t("filterHide", { state: label })
                    : t("filterShow", { state: label })
                }
                className={`inline-flex min-h-11 min-w-0 items-center no-underline transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] ${
                  active ? "opacity-100" : "opacity-40"
                }`}
              >
                <StatusLabel
                  tone={stateTone(state)}
                  className="w-full justify-center truncate"
                >
                  {label}
                </StatusLabel>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="hidden items-center gap-4 md:flex">
        <h2 className="page-title tabular shrink-0 text-2xl whitespace-nowrap">
          {pageTitle}
        </h2>

        <div className="ml-auto flex shrink-0 items-center gap-3">
          <div
            className="flex items-center gap-2"
            role="group"
            aria-label={t("legend")}
          >
            {stateFilters.map(([state, label]) => {
              const active = visibleStates.has(state);
              return (
                <Link
                  key={state}
                  href={toggleStateHref(state)}
                  aria-pressed={active}
                  title={
                    active
                      ? t("filterHide", { state: label })
                      : t("filterShow", { state: label })
                  }
                  className={`inline-flex min-h-11 items-center no-underline transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] ${
                    active ? "opacity-100" : "opacity-40"
                  }`}
                >
                  <StatusLabel tone={stateTone(state)}>{label}</StatusLabel>
                </Link>
              );
            })}
          </div>

          <div
            className="flex items-center"
            role="group"
            aria-label={t("viewToggle")}
          >
            {(
              [
                ["month", t("viewMonth")],
                ["week", t("viewWeek")],
              ] as const
            ).map(([value, label], index) => (
              <Link
                key={value}
                href={navHref(activeDate, value)}
                aria-current={view === value ? "page" : undefined}
                className={`inline-flex min-h-11 items-center border border-[var(--rule)] px-3 text-sm no-underline ${
                  index === 0 ? "rounded-l-md" : "-ml-px rounded-r-md"
                } ${
                  view === value
                    ? "relative z-[1] bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "bg-[var(--surface)]"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={navHref(prevDate)}
              aria-label={t("prevPeriod")}
              className="inline-flex min-h-11 min-w-11 items-center justify-center border border-[var(--rule)] bg-[var(--surface)] text-sm no-underline"
            >
              ←
            </Link>
            <Link
              href={navHref(today)}
              className="inline-flex min-h-11 items-center border border-[var(--rule)] bg-[var(--surface)] px-3 text-sm no-underline"
            >
              {t("today")}
            </Link>
            <Link
              href={navHref(nextDate)}
              aria-label={t("nextPeriod")}
              className="inline-flex min-h-11 min-w-11 items-center justify-center border border-[var(--rule)] bg-[var(--surface)] text-sm no-underline"
            >
              →
            </Link>
          </div>
        </div>
      </div>

      <div className="panel p-4">
        {selected ? (
          <FullCalendarWorkspace
            locale={locale as "en" | "de"}
            selectedResourceLabel={selected.label}
            initialDateISO={initialDateISO}
            initialView={initialView}
            events={events}
            resources={[selected]}
            defaultResourceKey={selected.key}
            enableDragResize
          />
        ) : (
          <p className="text-sm text-[var(--text-muted)]">{t("noResources")}</p>
        )}
      </div>

      {subscribeUrl ? (
        <CalendarSubscribePanel subscribeUrl={subscribeUrl} />
      ) : null}
    </section>
  );
}
