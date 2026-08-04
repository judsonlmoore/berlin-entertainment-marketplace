import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/src/i18n/navigation";
import { Link } from "@/src/i18n/navigation";
import { auth } from "@/src/auth";
import { getDb } from "@/src/db/client";
import { eq } from "drizzle-orm";
import { userRoles } from "@/src/db/schema/marketplace";
import { getActorContext } from "@/src/db/queries/actor";
import { VerificationBanner } from "@/src/components/verification-banner";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function OnboardingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("onboarding");
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <section className="grid gap-6">
        <h1 className="page-title text-[clamp(1.75rem,2.5vw,2.25rem)]">
          {t("title")}
        </h1>
        <p>
          <Link href="/sign-in">{t("ctaApply")}</Link>
        </p>
      </section>
    );
  }

  if (process.env.DATABASE_URL) {
    const db = getDb();
    const role = await db.query.userRoles.findFirst({
      where: eq(userRoles.userId, session.user.id),
    });
    if (!role) {
      redirect({
        href: "/onboarding/role-selection",
        locale: locale as "en" | "de",
      });
    }
  } else if (!session.user.roles.length) {
    redirect({
      href: "/onboarding/role-selection",
      locale: locale as "en" | "de",
    });
  }

  const actor = process.env.DATABASE_URL
    ? await getActorContext(session.user.id)
    : null;
  const needsVerification =
    actor &&
    ((actor.roles.includes("entertainer") && !actor.entertainerVerified) ||
      (actor.roles.includes("venue") && !actor.venueVerified));

  return (
    <section className="grid gap-6">
      <h1 className="page-title text-[clamp(1.75rem,2.5vw,2.25rem)]">
        {t("title")}
      </h1>
      {needsVerification ? <VerificationBanner /> : null}
      <div className="panel grid gap-3 p-6">
        <p className="text-sm text-[var(--text-muted)]">{t("approvalLabel")}</p>
        <p>
          <Link href="/profile">{t("ctaProfile")}</Link>
          {" · "}
          <Link href="/marketplace/calendar">{t("ctaCalendar")}</Link>
          {" · "}
          <Link href="/marketplace">{t("ctaMarketplace")}</Link>
        </p>
      </div>
    </section>
  );
}
