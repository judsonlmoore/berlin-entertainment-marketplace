import { eq } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/src/auth";
import { getDb } from "@/src/db/client";
import { marketplaceAccounts, userRoles } from "@/src/db/schema/marketplace";
import { Link } from "@/src/i18n/navigation";
import type { ApprovalState } from "@/src/domain/approval";
import { RoleModeToggle } from "@/src/components/role-mode-toggle";

type Props = { params: Promise<{ locale: string }> };

export default async function OnboardingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("onboarding");
  const status = await getTranslations("status");
  const nav = await getTranslations("nav");
  const session = await auth();

  if (!session?.user) {
    return (
      <section className="mx-auto max-w-xl">
        <h1 className="page-title text-3xl">{t("title")}</h1>
        <p className="mt-4">
          <Link href="/sign-in">{nav("signIn")}</Link>
        </p>
      </section>
    );
  }

  // Redirect to role selection if no active role mode is set
  if (!session.user.activeRoleMode) {
    redirect(`/${locale}/onboarding/role-selection`);
  }

  let account: { approvalState: ApprovalState } | null = null;
  let roles: string[] = session.user.roles;

  if (process.env.DATABASE_URL) {
    const db = getDb();
    const [row, roleRows] = await Promise.all([
      db.query.marketplaceAccounts.findFirst({
        where: eq(marketplaceAccounts.userId, session.user.id),
      }),
      db.query.userRoles.findMany({
        where: eq(userRoles.userId, session.user.id),
      }),
    ]);
    account = row
      ? { approvalState: row.approvalState as ApprovalState }
      : null;
    roles = roleRows.map((role) => role.role);
  }

  return (
    <section className="mx-auto max-w-xl">
      <h1 className="page-title text-3xl">{t("title")}</h1>

      {roles.length > 1 && (
        <div className="mt-6">
          <RoleModeToggle
            currentMode={session.user.activeRoleMode}
            availableRoles={roles as Array<"entertainer" | "venue">}
            locale={locale as "en" | "de"}
          />
        </div>
      )}

      <div className="panel mt-8 grid gap-3 p-6">
        {account ? (
          <>
            <p>
              {t("approvalLabel")}:{" "}
              <strong>{status(account.approvalState)}</strong>
            </p>
            <p>
              {t("rolesLabel")}: {roles.join(", ") || "—"}
            </p>
            <p>
              <Link href="/profile">{t("ctaProfile")}</Link>
            </p>
          </>
        ) : (
          <>
            <p>{t("noAccount")}</p>
            <Link href="/apply">{t("ctaApply")}</Link>
          </>
        )}
      </div>
    </section>
  );
}
