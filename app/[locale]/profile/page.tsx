import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/src/auth";
import { EntertainerProfileForm } from "@/src/components/entertainer-profile-form";
import { VenueProfileForm } from "@/src/components/venue-profile-form";
import { getActorContext } from "@/src/db/queries/actor";
import {
  getEntertainerProfileForUser,
  listVenuesForUser,
} from "@/src/db/queries/profiles";
import { can } from "@/src/domain/permissions";
import { Link } from "@/src/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

export default async function ProfilePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("profile");
  const publication = await getTranslations("publication");
  const session = await auth();

  if (!session?.user?.id || !process.env.DATABASE_URL) {
    return (
      <section className="mx-auto max-w-2xl">
        <h1 className="display text-4xl">{t("title")}</h1>
        <p className="mt-4">{t("signedOut")}</p>
      </section>
    );
  }

  const actor = await getActorContext(session.user.id);
  if (!actor) {
    return (
      <section className="mx-auto max-w-2xl">
        <h1 className="display text-4xl">{t("title")}</h1>
        <p className="mt-4">{t("signedOut")}</p>
      </section>
    );
  }

  const entertainerProfile = actor.roles.includes("entertainer")
    ? await getEntertainerProfileForUser(session.user.id)
    : null;
  const venueRows = actor.roles.includes("venue")
    ? await listVenuesForUser(session.user.id)
    : [];

  return (
    <section className="mx-auto grid max-w-3xl gap-10">
      <div>
        <h1 className="display text-4xl">{t("title")}</h1>
        <p className="mt-3 text-[var(--muted)]">{t("body")}</p>
      </div>

      {can(actor, "entertainer.manage_own_profile") ? (
        <div className="panel p-6">
          <h2 className="display text-2xl">{t("entertainerTitle")}</h2>
          <div className="mt-4">
            <EntertainerProfileForm
              locale={locale as "en" | "de"}
              defaultContactEmail={session.user.email ?? ""}
              {...(entertainerProfile
                ? {
                    publicationState: entertainerProfile.publicationState,
                    defaultValues: {
                      actName: entertainerProfile.actName,
                      category: entertainerProfile.category,
                      description: entertainerProfile.description,
                      groupSize: entertainerProfile.groupSize,
                      berlinBase: entertainerProfile.berlinBase,
                      travelRadiusKm: entertainerProfile.travelRadiusKm,
                      priceMinCents: entertainerProfile.priceMinCents,
                      priceMaxCents: entertainerProfile.priceMaxCents,
                      durationMinutes: entertainerProfile.durationMinutes,
                      technicalRequirements:
                        entertainerProfile.technicalRequirements,
                    },
                  }
                : {})}
            />
          </div>
        </div>
      ) : null}

      {can(actor, "venue.create") ? (
        <div className="panel grid gap-6 p-6">
          <div>
            <h2 className="display text-2xl">{t("venuesTitle")}</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {t("venuesBody")}
            </p>
          </div>

          {venueRows.length > 0 ? (
            <ul className="grid gap-2">
              {venueRows.map((venue) => (
                <li key={venue.id}>
                  <Link
                    href={`/profile/venues/${venue.id}`}
                    className="flex items-center justify-between border border-[var(--line)] px-3 py-2 no-underline"
                  >
                    <span>{venue.name}</span>
                    <span className="text-sm text-[var(--muted)]">
                      {publication(venue.publicationState as "draft")} ·{" "}
                      {venue.role}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--muted)]">{t("noVenues")}</p>
          )}

          <div>
            <h3 className="text-lg font-medium">{t("createVenue")}</h3>
            <div className="mt-3">
              <VenueProfileForm
                locale={locale as "en" | "de"}
                defaultContactEmail={session.user.email ?? ""}
              />
            </div>
          </div>
        </div>
      ) : null}

      {!can(actor, "entertainer.manage_own_profile") &&
      !can(actor, "venue.create") ? (
        <p className="panel p-6">{t("noRoles")}</p>
      ) : null}
    </section>
  );
}
