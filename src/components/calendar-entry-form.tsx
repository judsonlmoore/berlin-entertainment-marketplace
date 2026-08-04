"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  deleteAvailability,
  upsertAvailability,
} from "@/src/actions/calendar";
import { Button } from "@/src/components/ui/button";
import { useRouter } from "@/src/i18n/navigation";
import {
  parseDateInTimeZone,
  parseDatetimeLocalInTimeZone,
  toDatetimeLocal,
} from "@/src/lib/format";

type ResourceOption = {
  key: string;
  ownerType: "entertainer" | "venue_space";
  ownerId: string;
  label: string;
};

type BlockerState = "unavailable" | "tentative_hold";

export type CalendarEntryFormSuccess = {
  id?: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  state: BlockerState;
  title?: string;
  deleted?: boolean;
};

type EditEntry = {
  id: string;
  state: BlockerState;
  title?: string | null;
  privateNote?: string | null;
  holdExpiresAtLocal?: string | null;
  expectedVersion?: number;
};

type Props = {
  locale: "en" | "de";
  resources: ResourceOption[];
  /** Inclusive start date YYYY-MM-DD (all-day) or datetime-local string. */
  defaultStartsAt: string;
  /** Inclusive end date YYYY-MM-DD (all-day) or datetime-local string. */
  defaultEndsAt: string;
  defaultResourceKey?: string;
  defaultAllDay?: boolean;
  defaultState?: BlockerState;
  editEntry?: EditEntry;
  hideHeading?: boolean;
  onSuccess?: (result: CalendarEntryFormSuccess) => void;
};

function addDaysToYMD(ymd: string, days: number) {
  const [yS, mS, dS] = ymd.split("-");
  const y = Number(yS);
  const m = Number(mS) - 1;
  const d = Number(dS);
  const dt = new Date(Date.UTC(y, m, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function asDateOnly(value: string) {
  return value.slice(0, 10);
}

function asDateTimeLocal(value: string, fallbackTime: string) {
  if (value.includes("T")) return value.slice(0, 16);
  return `${asDateOnly(value)}T${fallbackTime}`;
}

export function CalendarEntryForm({
  locale,
  resources,
  defaultStartsAt,
  defaultEndsAt,
  defaultResourceKey,
  defaultAllDay = true,
  defaultState = "unavailable",
  editEntry,
  hideHeading = false,
  onSuccess,
}: Props) {
  const t = useTranslations("calendar");
  const ui = useTranslations("ui");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleting, startDeleteTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<BlockerState>(
    editEntry?.state ?? defaultState,
  );
  const [allDay, setAllDay] = useState(defaultAllDay);
  const isEdit = Boolean(editEntry?.id);

  const initialDates = useMemo(() => {
    const startDate = asDateOnly(defaultStartsAt);
    const endDate = asDateOnly(defaultEndsAt);
    return {
      startDate,
      endDate: endDate >= startDate ? endDate : startDate,
      startDateTime: asDateTimeLocal(defaultStartsAt, "10:00"),
      endDateTime: asDateTimeLocal(
        defaultEndsAt === defaultStartsAt
          ? `${startDate}T18:00`
          : defaultEndsAt,
        "18:00",
      ),
    };
  }, [defaultStartsAt, defaultEndsAt]);

  const [startDate, setStartDate] = useState(initialDates.startDate);
  const [endDate, setEndDate] = useState(initialDates.endDate);
  const [startDateTime, setStartDateTime] = useState(
    initialDates.startDateTime,
  );
  const [endDateTime, setEndDateTime] = useState(initialDates.endDateTime);
  const [holdExpiresLocal, setHoldExpiresLocal] = useState(
    editEntry?.holdExpiresAtLocal ?? "",
  );

  const defaultHoldExpiryLocal = () => {
    try {
      const { endsAtInstant } = (() => {
        if (allDay) {
          const endYmd = endDate >= startDate ? endDate : startDate;
          return {
            endsAtInstant: parseDateInTimeZone(addDaysToYMD(endYmd, 1)),
          };
        }
        return {
          endsAtInstant: parseDatetimeLocalInTimeZone(endDateTime),
        };
      })();
      const now = new Date();
      // Default: expire at the end of the blocked window (exclusive end for all-day).
      const candidate =
        endsAtInstant.getTime() > now.getTime()
          ? endsAtInstant
          : new Date(now.getTime() + 2 * 60 * 60 * 1000);
      return toDatetimeLocal(candidate);
    } catch {
      return "";
    }
  };

  if (resources.length === 0) {
    return (
      <p className="text-sm text-[var(--text-muted)]">{t("noResources")}</p>
    );
  }

  const lockedResource =
    resources.find((item) => item.key === defaultResourceKey) ?? resources[0]!;

  const states: Array<{ value: BlockerState; label: string }> = [
    { value: "unavailable", label: t("stateUnavailable") },
    { value: "tentative_hold", label: t("stateHold") },
  ];

  const resolveRange = () => {
    if (allDay) {
      const startYmd = startDate;
      const endYmd = endDate >= startDate ? endDate : startDate;
      return {
        startsAtInstant: parseDateInTimeZone(startYmd),
        endsAtInstant: parseDateInTimeZone(addDaysToYMD(endYmd, 1)),
      };
    }
    return {
      startsAtInstant: parseDatetimeLocalInTimeZone(startDateTime),
      endsAtInstant: parseDatetimeLocalInTimeZone(endDateTime),
    };
  };

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        const form = new FormData(event.currentTarget);
        const resourceKey = String(
          form.get("resource") ?? lockedResource.key ?? "",
        );
        const resource = resources.find((item) => item.key === resourceKey);
        if (!resource) {
          setError(t("noResources"));
          return;
        }
        const holdExpiresAt = String(form.get("holdExpiresAt") ?? "").trim();
        const title = String(form.get("title") ?? "").trim() || undefined;
        const privateNote =
          String(form.get("privateNote") ?? "").trim() || undefined;

        startTransition(async () => {
          try {
            const { startsAtInstant, endsAtInstant } = resolveRange();

            if (endsAtInstant <= startsAtInstant) {
              setError(t("endAfterStart"));
              return;
            }

            const result = await upsertAvailability({
              ...(editEntry?.id ? { entryId: editEntry.id } : {}),
              ...(editEntry?.expectedVersion !== undefined
                ? { expectedVersion: editEntry.expectedVersion }
                : {}),
              ownerType: resource.ownerType,
              ownerId: resource.ownerId,
              startsAt: startsAtInstant.toISOString(),
              endsAt: endsAtInstant.toISOString(),
              state,
              allDay,
              title,
              privateNote,
              ...(state === "tentative_hold" && holdExpiresAt
                ? {
                    holdExpiresAt:
                      parseDatetimeLocalInTimeZone(holdExpiresAt).toISOString(),
                  }
                : {}),
              locale,
            });
            if (!result.ok) {
              setError(result.message);
              return;
            }
            onSuccess?.({
              ...(result.id ? { id: result.id } : {}),
              startsAt: startsAtInstant.toISOString(),
              endsAt: endsAtInstant.toISOString(),
              allDay,
              state,
              ...(title ? { title } : {}),
            });
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : t("saveFailed"));
          }
        });
      }}
    >
      {!hideHeading ? (
        <h3 className="text-lg font-medium">
          {isEdit ? t("editTitle") : t("addTitle")}
        </h3>
      ) : null}
      {resources.length > 1 && !isEdit ? (
        <label className="label">
          <span>{t("resource")}</span>
          <select
            name="resource"
            className="field"
            defaultValue={defaultResourceKey ?? resources[0]?.key}
          >
            {resources.map((resource) => (
              <option key={resource.key} value={resource.key}>
                {resource.label}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <input type="hidden" name="resource" value={lockedResource.key} />
      )}

      <label className="inline-flex min-h-11 items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={allDay}
          onChange={(e) => {
            const next = e.target.checked;
            if (next) {
              setStartDate(asDateOnly(startDateTime));
              setEndDate(asDateOnly(endDateTime));
            } else {
              setStartDateTime(`${startDate}T10:00`);
              setEndDateTime(`${endDate}T18:00`);
            }
            setAllDay(next);
          }}
        />
        <span>{t("allDay")}</span>
      </label>

      {allDay ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="label">
            <span>{t("startsAt")}</span>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => {
                const next = e.target.value;
                setStartDate(next);
                if (endDate < next) setEndDate(next);
              }}
              className="field"
            />
          </label>
          <label className="label">
            <span>{t("endsAt")}</span>
            <input
              type="date"
              required
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="field"
            />
          </label>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="label">
            <span>{t("startsAt")}</span>
            <input
              type="datetime-local"
              required
              value={startDateTime}
              onChange={(e) => setStartDateTime(e.target.value)}
              className="field"
            />
          </label>
          <label className="label">
            <span>{t("endsAt")}</span>
            <input
              type="datetime-local"
              required
              value={endDateTime}
              onChange={(e) => setEndDateTime(e.target.value)}
              className="field"
            />
          </label>
        </div>
      )}

      <label className="label">
        <span>{t("entryTitle")}</span>
        <input
          name="title"
          className="field"
          type="text"
          defaultValue={editEntry?.title ?? ""}
        />
      </label>
      <label className="label">
        <span>{t("privateNote")}</span>
        <textarea
          name="privateNote"
          className="field"
          rows={2}
          defaultValue={editEntry?.privateNote ?? ""}
        />
      </label>

      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium text-[var(--ink)]">
          {t("state")}
        </legend>
        <div
          role="radiogroup"
          aria-label={t("state")}
          className="flex flex-wrap gap-2"
        >
          {states.map((option) => {
            const active = state === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  setState(option.value);
                  if (
                    option.value === "tentative_hold" &&
                    !holdExpiresLocal
                  ) {
                    setHoldExpiresLocal(defaultHoldExpiryLocal());
                  }
                }}
                className={`inline-flex min-h-11 items-center border px-3 text-sm ${
                  active
                    ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "border-[var(--rule)] bg-[var(--surface)] text-[var(--ink)]"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {state === "tentative_hold" ? (
        <label className="label">
          <span>{t("holdExpiresAt")}</span>
          <input
            name="holdExpiresAt"
            type="datetime-local"
            required
            className="field"
            value={holdExpiresLocal || defaultHoldExpiryLocal()}
            onChange={(e) => setHoldExpiresLocal(e.target.value)}
          />
          <span className="text-xs font-normal text-[var(--text-muted)]">
            {t("holdExpiresHint")}
          </span>
        </label>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          pending={pending}
          pendingLabel={ui("working")}
          className="flex-1"
        >
          {isEdit ? t("saveChanges") : t("add")}
        </Button>
        {isEdit && editEntry ? (
          <Button
            type="button"
            variant="secondary"
            pending={deleting}
            pendingLabel={ui("working")}
            onClick={() => {
              setError(null);
              startDeleteTransition(async () => {
                const result = await deleteAvailability(editEntry.id, locale);
                if (!result.ok) {
                  setError(result.message);
                  return;
                }
                onSuccess?.({
                  id: editEntry.id,
                  startsAt: "",
                  endsAt: "",
                  allDay,
                  state,
                  deleted: true,
                });
                router.refresh();
              });
            }}
          >
            {t("remove")}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
