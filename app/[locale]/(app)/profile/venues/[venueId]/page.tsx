import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { auth } from "@/src/auth";
import { VenueMembersPanel } from "@/src/components/venue-members-panel";
import { VenueProfileForm } from "@/src/components/venue-profile-form";
import { VenueSpacesEditor } from "@/src/components/venue-spaces-editor";
import { getActorContext } from "@/src/db/queries/actor";
import { OpportunityForm } from "@/src/components/opportunity-form";
import {
  getVenueForOwnerView,
  listVenueMembers,
  listVenueSpaces,
} from "@/src/db/queries/profiles";
import { listVenueOpportunities } from "@/src/db/queries/opportunities";
import { can } from "@/src/domain/permissions";
import { Link } from "@/src/i18n/navigation";

type Props = {
  params: Promise<{ locale: string; venueId: string }>;
};

export default async function VenueDetailPage({ params }: Props) {
  const { locale, venueId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("profile");
  const opportunitiesT = await getTranslations("opportunities");
  const session = await auth();

  if (!session?.user?.id || !process.env.DATABASE_URL) {
    notFound();
  }

  const actor = await getActorContext(session.user.id);
  if (!actor) {
    notFound();
  }

  const canOperate = can(actor, "venue.operate", { venueId });
  if (!canOperate && !actor.isPlatformStaff) {
    notFound();
  }

  const [venue, members, venueOpportunities, venueSpaces] = await Promise.all([
    getVenueForOwnerView(venueId),
    listVenueMembers(venueId),
    listVenueOpportunities(venueId),
    listVenueSpaces(venueId),
  ]);
  if (!venue) {
    notFound();
  }

  const canManage = can(actor, "venue.manage", { venueId });
  const canManageOpportunities = can(actor, "opportunity.manage", { venueId });
  const productionResources =
    typeof venue.productionResources === "object" && venue.productionResources
      ? (venue.productionResources as Record<string, unknown>)
      : {};
  const productionNotes = String(productionResources.notes ?? "");
  const productionField = (key: string) =>
    String(productionResources[key] ?? "");
  const socialLinks =
    typeof venue.socialLinks === "object" && venue.socialLinks
      ? (venue.socialLinks as Record<string, string>)
      : {};

  return (
    <section className="mx-auto grid max-w-3xl gap-8">
      <div>
        <p className="text-sm">
          <Link href="/profile">{t("backToProfiles")}</Link>
        </p>
        <h1 className="page-title mt-3 text-[clamp(1.75rem,2.5vw,2.25rem)]">{venue.name}</h1>
        <p className="mt-2 text-[var(--muted)]">{venue.district}</p>
      </div>

      {canManage ? (
        <div className="panel p-6">
          <VenueProfileForm
            locale={locale as "en" | "de"}
            venueId={venue.id}
            publicationState={venue.publicationState}
            defaultContactEmail={session.user.email ?? ""}
            defaultValues={{
              name: venue.name,
              shortDescription: venue.shortDescription,
              addressLine1: venue.addressLine1,
              addressLine2: venue.addressLine2,
              district: venue.district,
              postalCode: venue.postalCode,
              latitude: venue.latitude,
              longitude: venue.longitude,
              venueType: venue.venueType,
              audienceDescription: venue.audienceDescription,
              capacity: venue.capacity,
              capacityContext: venue.capacityContext,
              productionNotes,
              productionPa: productionField("pa"),
              productionMixer: productionField("mixer"),
              productionMics: productionField("mics"),
              productionLighting: productionField("lighting"),
              productionBackline: productionField("backline"),
              productionPower: productionField("power"),
              productionStage: productionField("stage"),
              houseRules: venue.houseRules,
              loadInNotes: venue.loadInNotes,
              accessibilityNotes: venue.accessibilityNotes,
              socialLinks,
              websiteUrl: venue.websiteUrl,
            }}
          />
          <div className="mt-6 border-t border-[var(--rule)] pt-4">
            <VenueSpacesEditor
              locale={locale as "en" | "de"}
              venueId={venue.id}
              spaces={venueSpaces}
            />
          </div>
        </div>
      ) : null}

      <div className="panel p-6">
        <VenueMembersPanel
          locale={locale as "en" | "de"}
          venueId={venue.id}
          members={members}
          canManage={canManage}
          currentUserId={session.user.id}
        />
      </div>

      {canManageOpportunities ? (
        <div className="panel grid gap-6 p-6">
          <div>
            <h2 className="page-title text-xl">
              {opportunitiesT("venueSectionTitle")}
            </h2>
            <ul className="mt-3 grid gap-2">
              {venueOpportunities.length === 0 ? (
                <li className="text-sm text-[var(--muted)]">
                  {opportunitiesT("empty")}
                </li>
              ) : null}
              {venueOpportunities.map((opportunity) => (
                <li key={opportunity.id}>
                  <Link
                    href={`/marketplace/opportunities/${opportunity.id}`}
                    className="flex justify-between border border-[var(--line)] px-3 py-2 no-underline"
                  >
                    <span>{opportunity.title}</span>
                    <span className="text-sm text-[var(--muted)]">
                      {opportunity.state}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <OpportunityForm locale={locale as "en" | "de"} venueId={venue.id} />
        </div>
      ) : null}
    </section>
  );
}
