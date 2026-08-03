import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { getDiscoverableVenueDetail } from "@/src/db/queries/discovery";
import { requireDiscoveryAccess } from "@/src/db/queries/discovery-access";
import { Link } from "@/src/i18n/navigation";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function VenueDiscoveryDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("marketplace");
  const access = await requireDiscoveryAccess();

  if (!access.ok) {
    return (
      <section className="mx-auto max-w-xl">
        <h1 className="display text-4xl">{t("venuesTitle")}</h1>
        <p className="mt-4">{t("denied")}</p>
      </section>
    );
  }

  const venue = await getDiscoverableVenueDetail({
    venueId: id,
    viewerUserId: access.actor.userId,
  });
  if (!venue) {
    notFound();
  }

  const productionNotes =
    typeof venue.productionResources.notes === "string"
      ? venue.productionResources.notes
      : "";

  return (
    <section className="mx-auto max-w-2xl">
      <p className="text-sm">
        <Link href="/marketplace/venues">{t("backToVenues")}</Link>
      </p>
      <h1 className="display mt-3 text-4xl">{venue.name}</h1>
      <p className="mt-2 text-[var(--muted)]">
        {venue.district} · {venue.venueType}
      </p>

      <div className="panel mt-6 grid gap-3 p-6 text-sm">
        <p>{venue.shortDescription}</p>
        <p>
          {t("address")}: {venue.addressLine1}
          {venue.addressLine2 ? `, ${venue.addressLine2}` : ""},{" "}
          {venue.postalCode} {venue.city}
        </p>
        {venue.latitude && venue.longitude ? (
          <p>
            {t("coordinates")}: {venue.latitude}, {venue.longitude}
          </p>
        ) : null}
        <p>
          {t("capacity")}: {venue.capacity}
          {venue.capacityContext ? ` (${venue.capacityContext})` : ""}
        </p>
        <p>
          {t("audience")}: {venue.audienceDescription}
        </p>
        {productionNotes ? (
          <p>
            {t("production")}: {productionNotes}
          </p>
        ) : null}
        {venue.websiteUrl ? (
          <p>
            {t("website")}: {venue.websiteUrl}
          </p>
        ) : null}
      </div>

      <div className="panel mt-4 p-6">
        <h2 className="text-lg font-semibold">{t("contactTitle")}</h2>
        {venue.contactLocked || !venue.contacts ? (
          <p className="mt-2 text-sm text-[var(--muted)]">
            {t("contactLocked")}
          </p>
        ) : (
          <ul className="mt-2 grid gap-1 text-sm">
            {venue.contacts.map((contact) => (
              <li key={contact.id}>
                {contact.kind}: {contact.value}
                {contact.isPreferred ? ` (${t("preferred")})` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
