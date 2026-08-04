import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/src/i18n/navigation";
import { Link } from "@/src/i18n/navigation";
import { auth } from "@/src/auth";
import { getDb } from "@/src/db/client";
import { eq } from "drizzle-orm";
import { userRoles } from "@/src/db/schema/marketplace";
import { RoleSelectionForm } from "@/src/components/role-selection-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function RoleSelectionPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("roleSelection");
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <section className="grid gap-6">
        <h1 className="page-title text-[clamp(1.75rem,2.5vw,2.25rem)]">
          {t("title")}
        </h1>
        <p>
          <Link href="/sign-in">{t("signInFirst")}</Link>
        </p>
      </section>
    );
  }

  if (process.env.DATABASE_URL) {
    const db = getDb();
    const role = await db.query.userRoles.findFirst({
      where: eq(userRoles.userId, session.user.id),
    });
    if (role) {
      redirect({ href: "/marketplace", locale: locale as "en" | "de" });
    }
  } else if (session.user.roles.length > 0) {
    redirect({ href: "/marketplace", locale: locale as "en" | "de" });
  }

  return (
    <section className="mx-auto grid max-w-lg gap-6">
      <div>
        <h1 className="page-title text-[clamp(1.75rem,2.5vw,2.25rem)]">
          {t("title")}
        </h1>
        <p className="mt-2 text-[var(--text-muted)]">{t("body")}</p>
      </div>
      <div className="panel p-6">
        <RoleSelectionForm locale={locale as "en" | "de"} />
      </div>
    </section>
  );
}
