import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/src/auth";
import { getActorContext } from "@/src/db/queries/actor";
import { can } from "@/src/domain/permissions";

type Props = { params: Promise<{ locale: string }> };

export default async function MarketplacePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("marketplace");
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <section className="mx-auto max-w-xl">
        <h1 className="display text-4xl">{t("title")}</h1>
        <p className="mt-4">{t("denied")}</p>
      </section>
    );
  }

  let allowed =
    session.user.isPlatformStaff || session.user.approvalState === "approved";

  if (process.env.DATABASE_URL) {
    const actor = await getActorContext(session.user.id);
    allowed = Boolean(actor && can(actor, "marketplace.discover"));
  }

  return (
    <section className="mx-auto max-w-2xl">
      <h1 className="display text-4xl">{t("title")}</h1>
      <p className="mt-4 text-[var(--muted)]">
        {allowed ? t("body") : t("denied")}
      </p>
    </section>
  );
}
