"use client";

import "temporal-polyfill/global";
import { useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import type { CalendarApi, EventInput } from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import interactionPlugin from "@fullcalendar/react/interaction";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import classicThemePlugin from "@fullcalendar/react/themes/classic";
import deLocale from "@fullcalendar/react/locales/de";
import enGbLocale from "@fullcalendar/react/locales/en-gb";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/classic/palette.css";
import "@fullcalendar/react/themes/classic/theme.css";

import styles from "./fullcalendar-workspace.module.css";
import { CalendarEntryForm } from "@/src/components/calendar-entry-form";
import { toDateInput, toDatetimeLocal } from "@/src/lib/format";
import { calendarEventStyle } from "@/src/lib/calendar-event-style";
import { moveCalendarEntry } from "@/src/actions/calendar";

export type CalendarWorkspaceEvent = EventInput;

type ResourceOption = {
  key: string;
  ownerType: "entertainer" | "venue_space";
  ownerId: string;
  label: string;
};

type Props = {
  locale: "en" | "de";
  selectedResourceLabel: string;
  events: CalendarWorkspaceEvent[];
  initialDateISO: string;
  initialView: "dayGridMonth" | "timeGridWeek";
  resources?: ResourceOption[];
  defaultResourceKey?: string;
  enableDragResize?: boolean;
};

type EntryDraft = {
  mode: "create" | "edit";
  defaultStartsAt: string;
  defaultEndsAt: string;
  defaultAllDay: boolean;
  editEntry?: {
    id: string;
    state: "unavailable" | "tentative_hold";
    title?: string | null;
    privateNote?: string | null;
    holdExpiresAtLocal?: string | null;
    expectedVersion?: number;
  };
};

function toJsDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const maybe = value as {
    epochMilliseconds?: number;
    toInstant?: () => { epochMilliseconds: number };
    toString?: () => string;
  };
  if (typeof maybe.epochMilliseconds === "number") {
    return new Date(maybe.epochMilliseconds);
  }
  if (typeof maybe.toInstant === "function") {
    return new Date(maybe.toInstant().epochMilliseconds);
  }
  if (typeof maybe.toString === "function") {
    const parsed = new Date(maybe.toString());
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function addDaysToYMD(ymd: string, days: number) {
  const [yS, mS, dS] = ymd.split("-");
  const dt = new Date(Date.UTC(Number(yS), Number(mS) - 1, Number(dS)));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function eventsSignature(events: CalendarWorkspaceEvent[]) {
  return events
    .map(
      (event) =>
        `${event.id}:${event.start}:${event.end}:${event.title}:${event.allDay}`,
    )
    .join("|");
}

function formatEventTimeRange(
  start: Date,
  end: Date,
  locale: "en" | "de",
): string {
  const fmt = new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return `${fmt.format(start)}–${fmt.format(end)}`;
}

export function FullCalendarWorkspace({
  locale,
  selectedResourceLabel,
  events,
  initialDateISO,
  initialView,
  resources,
  defaultResourceKey,
  enableDragResize,
}: Props) {
  const router = useRouter();
  const t = useTranslations("calendar");
  const calendarRef = useRef<{ getApi: () => CalendarApi } | null>(null);

  const [draft, setDraft] = useState<EntryDraft | null>(null);
  const [successFlash, setSuccessFlash] = useState(false);

  const selectable = Boolean(resources?.length);
  const editingEnabled = Boolean(enableDragResize);
  const safeDefaultResourceKey =
    defaultResourceKey ?? resources?.[0]?.key ?? "";

  // Remount when view/date/events change so FC always paints current data.
  // Keeping flash outside this key so success feedback survives refresh.
  const calendarMountKey = `${initialView}:${initialDateISO}:${eventsSignature(events)}`;

  useEffect(() => {
    if (!successFlash) return;
    const timer = window.setTimeout(() => setSuccessFlash(false), 1600);
    return () => window.clearTimeout(timer);
  }, [successFlash]);

  const closeDraft = () => setDraft(null);

  return (
    <section
      className={styles.wrapper}
      aria-label={`Calendar: ${selectedResourceLabel}`}
    >
      {successFlash ? (
        <p className={styles.successFlash} role="status" aria-live="polite">
          <span aria-hidden="true">✓</span> {t("entrySaved")}
        </p>
      ) : null}

      <FullCalendar
        key={calendarMountKey}
        ref={calendarRef}
        plugins={[
          classicThemePlugin,
          dayGridPlugin,
          timeGridPlugin,
          interactionPlugin,
        ]}
        initialView={initialView}
        initialDate={initialDateISO}
        timeZone="Europe/Berlin"
        locales={[deLocale, enGbLocale]}
        locale={locale === "de" ? "de" : "en-gb"}
        height="auto"
        contentHeight="auto"
        firstDay={1}
        navLinks={false}
        nowIndicator
        slotMinTime="08:00:00"
        slotMaxTime="24:00:00"
        headerToolbar={false}
        fixedWeekCount={false}
        selectable={selectable}
        editable={editingEnabled}
        eventStartEditable={editingEnabled}
        eventDurationEditable={editingEnabled}
        eventResizableFromStart={false}
        dayMaxEventRows={4}
        // Prevent month timed events from using FC's list-item preset (default
        // colored dot with margin-inline). We render our own timedDot instead.
        eventDisplay="block"
        displayEventTime
        displayEventEnd
        eventTimeFormat={{
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }}
        events={events}
        eventClass={(arg) => {
          const state = arg.event.extendedProps?.state as string | undefined;
          const style = calendarEventStyle(state ?? "unavailable");
          const isMonth = arg.view.type === "dayGridMonth";
          if (isMonth && !arg.event.allDay) {
            return `${style.className} ${styles.timedMonth}`;
          }
          return `${style.className} ${styles.solidEvent}`;
        }}
        eventClick={(info) => {
          const bookingId =
            (info.event.extendedProps?.bookingId as string | null) ?? null;
          if (bookingId) {
            router.push(`/${locale}/marketplace/bookings/${bookingId}`);
            return;
          }

          const state = info.event.extendedProps?.state as string | undefined;
          if (state === "imported_busy") return;
          if (state !== "unavailable" && state !== "tentative_hold") return;

          const editable = Boolean(info.event.extendedProps?.editable);
          if (!editable) return;

          const start = toJsDate(info.event.start);
          const end = toJsDate(info.event.end);
          if (!start || !end) return;

          const allDay = Boolean(info.event.allDay);
          const startValue = allDay
            ? toDateInput(start)
            : toDatetimeLocal(start);
          let endValue = allDay ? toDateInput(end) : toDatetimeLocal(end);
          if (allDay && endValue > startValue) {
            endValue = addDaysToYMD(endValue, -1);
          }

          const holdIso = info.event.extendedProps?.holdExpiresAt as
            string | null | undefined;

          setDraft({
            mode: "edit",
            defaultStartsAt: startValue,
            defaultEndsAt: endValue,
            defaultAllDay: allDay,
            editEntry: {
              id: info.event.id,
              state,
              title:
                (info.event.extendedProps?.entryTitle as string | null) ?? null,
              privateNote:
                (info.event.extendedProps?.privateNote as string | null) ??
                null,
              holdExpiresAtLocal: holdIso
                ? toDatetimeLocal(new Date(holdIso))
                : null,
              ...(typeof info.event.extendedProps?.version === "number"
                ? { expectedVersion: info.event.extendedProps.version }
                : {}),
            },
          });
        }}
        eventContent={(arg) => {
          const isMonth = arg.view.type === "dayGridMonth";
          const title = arg.event.title ?? "";
          const state = arg.event.extendedProps?.state as string | undefined;
          const style = calendarEventStyle(state ?? "unavailable");

          if (isMonth && !arg.event.allDay) {
            const start = toJsDate(arg.event.start);
            const end = toJsDate(arg.event.end);
            const timeLabel =
              start && end ? formatEventTimeRange(start, end, locale) : "";
            return (
              <div className={styles.timedMonthRow}>
                <span
                  className={styles.timedDot}
                  style={{ background: style.color }}
                  aria-hidden="true"
                />
                <span className={styles.timedTitle}>{title}</span>
                {timeLabel ? (
                  <span className={styles.timedTime}>{timeLabel}</span>
                ) : null}
              </div>
            );
          }

          return (
            <div className={styles.eventBox} data-state={state}>
              {title}
            </div>
          );
        }}
        selectOverlap={false}
        select={(selectionInfo) => {
          if (!resources?.length) return;

          const start = toJsDate(selectionInfo.start);
          const end = toJsDate(selectionInfo.end);
          if (!start || !end) return;

          selectionInfo.view.calendar.unselect();

          const startYmd = toDateInput(start);
          let endYmd = toDateInput(end);
          if (selectionInfo.allDay && endYmd > startYmd) {
            endYmd = addDaysToYMD(endYmd, -1);
          } else if (!selectionInfo.allDay) {
            endYmd = startYmd;
          }

          setDraft({
            mode: "create",
            defaultStartsAt: startYmd,
            defaultEndsAt: endYmd,
            defaultAllDay: true,
          });
        }}
        eventDrop={(dropInfo) => {
          if (!editingEnabled) return;

          const eventId = dropInfo.event.id;
          const start = toJsDate(dropInfo.event.start);
          const end = toJsDate(dropInfo.event.end);
          const expectedVersion = dropInfo.event.extendedProps?.version as
            number | undefined;

          if (!eventId || !start || !end) {
            dropInfo.revert();
            return;
          }

          const payload: Parameters<typeof moveCalendarEntry>[0] = {
            entryId: eventId,
            startsAt: start.toISOString(),
            endsAt: end.toISOString(),
            locale,
          };

          if (expectedVersion !== undefined) {
            payload.expectedVersion = expectedVersion;
          }

          moveCalendarEntry(payload).then((result) => {
            if (!result.ok) {
              dropInfo.revert();
              window.alert(result.message);
              return;
            }
            router.refresh();
          });
        }}
        eventResize={(resizeInfo) => {
          if (!editingEnabled) return;

          const eventId = resizeInfo.event.id;
          const start = toJsDate(resizeInfo.event.start);
          const end = toJsDate(resizeInfo.event.end);
          const expectedVersion = resizeInfo.event.extendedProps?.version as
            number | undefined;

          if (!eventId || !start || !end) {
            resizeInfo.revert();
            return;
          }

          const payload: Parameters<typeof moveCalendarEntry>[0] = {
            entryId: eventId,
            startsAt: start.toISOString(),
            endsAt: end.toISOString(),
            locale,
          };

          if (expectedVersion !== undefined) {
            payload.expectedVersion = expectedVersion;
          }

          moveCalendarEntry(payload).then((result) => {
            if (!result.ok) {
              resizeInfo.revert();
              window.alert(result.message);
              return;
            }
            router.refresh();
          });
        }}
      />

      {draft && resources?.length ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={draft.mode === "edit" ? t("editTitle") : t("addTitle")}
          onClick={closeDraft}
          onKeyDown={(event) => {
            if (event.key === "Escape") closeDraft();
          }}
        >
          <div
            className="panel w-full max-w-lg bg-[var(--surface)] p-6"
            onClick={(e) => e.stopPropagation()}
            role="document"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="page-title text-xl">
                  {draft.mode === "edit" ? t("editTitle") : t("addTitle")}
                </h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {selectedResourceLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDraft}
                className="text-[var(--text-muted)] hover:text-[var(--ink)]"
                aria-label={t("close")}
              >
                ✕
              </button>
            </div>

            <CalendarEntryForm
              locale={locale}
              resources={resources}
              defaultResourceKey={safeDefaultResourceKey}
              defaultAllDay={draft.defaultAllDay}
              defaultStartsAt={draft.defaultStartsAt}
              defaultEndsAt={draft.defaultEndsAt}
              {...(draft.editEntry ? { editEntry: draft.editEntry } : {})}
              hideHeading
              onSuccess={() => {
                closeDraft();
                setSuccessFlash(true);
              }}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
