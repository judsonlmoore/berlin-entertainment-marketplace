import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  RespondDirectRequestButtons,
  VenueRespondToChangesButtons,
  WithdrawDirectRequestButton,
} from "@/src/components/direct-request-actions";
import { PageHeader } from "@/src/components/ui/page-header";
import { requireDiscoveryAccess } from "@/src/db/queries/discovery-access";
import { formatEur } from "@/src/lib/format";
import {
  listDirectRequestsForEntertainer,
  listDirectRequestsForVenues,
} from "@/src/db/queries/direct-requests";
import { can } from "@/src/domain/permissions";

type Props = { params: Promise<{ locale: string }> };

export default async function DirectRequestsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("directRequests");
  const market = await getTranslations("marketplace");
  const access = await requireDiscoveryAccess();

  if (!access.ok) {
    return (
      <section className="grid gap-8">
        <PageHeader title={t("title")} body={market("denied")} />
      </section>
    );
  }

  const operableVenueIds = access.actor.venueMemberships
    .filter((m) => m.status === "active")
    .map((m) => m.venueId);

  const [incoming, outgoing] = await Promise.all([
    can(access.actor, "direct_request.respond")
      ? listDirectRequestsForEntertainer(access.actor.userId)
      : Promise.resolve([]),
    operableVenueIds.length > 0
      ? listDirectRequestsForVenues(operableVenueIds)
      : Promise.resolve([]),
  ]);

  const dateFmt = new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  });

  return (
    <section className="grid gap-8">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} body={t("body")} />

      {can(access.actor, "direct_request.respond") ? (
        <div className="panel grid gap-3 p-6">
          <h2 className="page-title text-xl">{t("incomingTitle")}</h2>
          {incoming.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              {t("emptyIncoming")}
            </p>
          ) : null}
          <ul className="grid gap-3">
            {incoming.map((request) => (
              <li
                key={request.id}
                className="border border-[var(--rule)] p-4 text-sm"
              >
                <p className="font-medium">
                  {request.venueName} · {request.district}
                </p>
                <p className="text-[var(--text-muted)]">
                  {request.formatCategory} · {request.state}
                </p>
                <p className="mt-2">
                  {dateFmt.format(request.startsAt)} –{" "}
                  {dateFmt.format(request.endsAt)}
                </p>
                <p>
                  {t("proposedFee")}:{" "}
                  {formatEur(request.proposedFeeCents, locale)}
                </p>
                {request.notes ? <p className="mt-1">{request.notes}</p> : null}
                <div className="mt-3">
                  <RespondDirectRequestButtons
                    locale={locale as "en" | "de"}
                    requestId={request.id}
                    state={request.state}
                  />
                </div>
                {request.state === "accepted" ? (
                  <p className="mt-2 text-[var(--text-muted)]">
                    {t("acceptedHint")}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {operableVenueIds.length > 0 ? (
        <div className="panel grid gap-3 p-6">
          <h2 className="page-title text-xl">{t("outgoingTitle")}</h2>
          {outgoing.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              {t("emptyOutgoing")}
            </p>
          ) : null}
          <ul className="grid gap-3">
            {outgoing.map((request) => (
              <li
                key={request.id}
                className="border border-[var(--rule)] p-4 text-sm"
              >
                <p className="font-medium">
                  {request.actName} ← {request.venueName}
                </p>
                <p className="text-[var(--text-muted)]">
                  {request.formatCategory} · {request.state}
                </p>
                <p className="mt-2">
                  {dateFmt.format(request.startsAt)} –{" "}
                  {dateFmt.format(request.endsAt)}
                </p>
                <p>
                  {t("proposedFee")}:{" "}
                  {formatEur(request.proposedFeeCents, locale)}
                </p>
                <div className="mt-3">
                  <WithdrawDirectRequestButton
                    locale={locale as "en" | "de"}
                    requestId={request.id}
                    state={request.state}
                  />
                  <VenueRespondToChangesButtons
                    locale={locale as "en" | "de"}
                    requestId={request.id}
                    state={request.state}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
