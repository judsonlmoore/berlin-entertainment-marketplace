import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { DirectRequestForm } from "@/src/components/direct-request-form";
import { getDiscoverableEntertainerDetail } from "@/src/db/queries/discovery";
import { requireDiscoveryAccess } from "@/src/db/queries/discovery-access";
import { listVenuesForUser } from "@/src/db/queries/profiles";
import { can } from "@/src/domain/permissions";
import { Link } from "@/src/i18n/navigation";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

function formatEur(cents: number, locale: string) {
  return new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default async function EntertainerDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("marketplace");
  const access = await requireDiscoveryAccess();

  if (!access.ok) {
    return (
      <section className="mx-auto max-w-xl">
        <h1 className="display text-4xl">{t("entertainersTitle")}</h1>
        <p className="mt-4">{t("denied")}</p>
      </section>
    );
  }

  const profile = await getDiscoverableEntertainerDetail({
    entertainerProfileId: id,
    viewerUserId: access.actor.userId,
  });
  if (!profile) {
    notFound();
  }

  const operableVenues = (await listVenuesForUser(access.actor.userId)).filter(
    (venue) => can(access.actor, "direct_request.send", { venueId: venue.id }),
  );
  const isOwnProfile = profile.userId === access.actor.userId;

  return (
    <section className="mx-auto max-w-2xl">
      <p className="text-sm">
        <Link href="/marketplace/entertainers">{t("backToEntertainers")}</Link>
      </p>
      <h1 className="display mt-3 text-4xl">{profile.actName}</h1>
      <p className="mt-2 text-[var(--muted)]">
        {profile.category} · {profile.berlinBase}
      </p>

      <div className="panel mt-6 grid gap-3 p-6 text-sm">
        <p>{profile.description}</p>
        <p>
          {t("groupSize")}: {profile.groupSize}
        </p>
        <p>
          {t("duration")}: {profile.durationMinutes} {t("minutes")}
        </p>
        <p>
          {t("priceRange")}: {formatEur(profile.priceMinCents, locale)} –{" "}
          {formatEur(profile.priceMaxCents, locale)}
        </p>
        <p>
          {t("travelRadius")}: {profile.travelRadiusKm} km
        </p>
        <p>
          {t("technicalRequirements")}: {profile.technicalRequirements}
        </p>
      </div>

      <div className="panel mt-4 p-6">
        <h2 className="text-lg font-semibold">{t("contactTitle")}</h2>
        {profile.contactLocked || !profile.contacts ? (
          <p className="mt-2 text-sm text-[var(--muted)]">
            {t("contactLocked")}
          </p>
        ) : (
          <ul className="mt-2 grid gap-1 text-sm">
            {profile.contacts.map((contact) => (
              <li key={contact.id}>
                {contact.kind}: {contact.value}
                {contact.isPreferred ? ` (${t("preferred")})` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>

      {!isOwnProfile && operableVenues.length > 0 ? (
        <div id="direct-request" className="panel mt-4 scroll-mt-24 p-6">
          <DirectRequestForm
            locale={locale as "en" | "de"}
            entertainerProfileId={profile.id}
            venues={operableVenues.map((venue) => ({
              id: venue.id,
              name: venue.name,
            }))}
          />
        </div>
      ) : null}
    </section>
  );
}
