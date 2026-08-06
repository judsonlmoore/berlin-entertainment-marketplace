"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/src/i18n/navigation";
import { sendVenueConnectionRequestAction } from "@/src/actions/profile-enquiries";
import { Button } from "@/src/components/ui/button";

type VenueOption = {
  id: string;
  name: string;
  activeBookingId?: string | null;
  cooldownDaysRemaining?: number | null;
};

type Props = {
  locale: "en" | "de";
  entertainerProfileId: string;
  venues: VenueOption[];
  locked?: boolean;
};

export function ConnectionRequestButton({
  locale,
  entertainerProfileId,
  venues,
  locked = false,
}: Props) {
  const t = useTranslations("marketplace");
  const router = useRouter();
  const [venueId, setVenueId] = useState(venues[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const selectedVenueId = venues.some((v) => v.id === venueId)
    ? venueId
    : (venues[0]?.id ?? "");
  const selected = venues.find((v) => v.id === selectedVenueId);
  const cooldownDays = selected?.cooldownDaysRemaining ?? null;
  const onCooldown = cooldownDays != null && cooldownDays > 0;
  const inactive = onCooldown || Boolean(selected?.activeBookingId);

  if (locked || venues.length === 0) {
    return (
      <p className="max-w-xs text-right text-sm text-[var(--text-muted)]">
        {t("requestActLocked")}{" "}
        <Link href="/profile" className="font-medium underline">
          {t("viewProfile")}
        </Link>
      </p>
    );
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      {venues.length > 1 ? (
        <label className="grid gap-1 text-sm">
          <span className="sr-only">{t("connectionRequestVenue")}</span>
          <select
            className="field min-h-11 min-w-[12rem]"
            value={selectedVenueId}
            onChange={(e) => setVenueId(e.target.value)}
          >
            {venues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <Button
        type="button"
        variant="primary"
        disabled={pending || !selectedVenueId || inactive}
        pending={pending}
        pendingLabel={t("connectionRequestSending")}
        onClick={() => {
          if (inactive) return;
          setError(null);
          startTransition(async () => {
            const result = await sendVenueConnectionRequestAction({
              venueId: selectedVenueId,
              entertainerProfileId,
              locale,
            });
            if (!result.ok) {
              setError(result.message);
              return;
            }
            router.refresh();
          });
        }}
      >
        {t("connectionRequestCta")}
      </Button>
      {onCooldown ? (
        <p className="max-w-xs text-right text-sm text-[var(--text-muted)]">
          {t("connectionRequestCooldown", { days: cooldownDays })}
          {selected?.activeBookingId ? (
            <>
              {" "}
              <Link
                href={`/marketplace/bookings/${selected.activeBookingId}`}
                className="font-medium underline"
              >
                {t("connectionRequestSent")}
              </Link>
            </>
          ) : null}
        </p>
      ) : selected?.activeBookingId ? (
        <p className="max-w-xs text-right text-sm text-[var(--text-muted)]">
          {t("connectionRequestOpen")}{" "}
          <Link
            href={`/marketplace/bookings/${selected.activeBookingId}`}
            className="font-medium underline"
          >
            {t("connectionRequestSent")}
          </Link>
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="max-w-xs text-right text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
