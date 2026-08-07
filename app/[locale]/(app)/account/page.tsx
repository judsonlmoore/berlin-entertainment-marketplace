import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/src/auth";
import { AccountDeletionSection } from "@/src/components/account-deletion-section";
import { LocaleSwitcher } from "@/src/components/locale-switcher";
import { Avatar } from "@/src/components/ui/monogram";
import { PageHeader } from "@/src/components/ui/page-header";
import { StatusLabel } from "@/src/components/ui/status-label";
import { getActorContext } from "@/src/db/queries/actor";

type Props = { params: Promise<{ locale: string }> };

export default async function AccountPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("accountPage");
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <section className="mx-auto max-w-2xl">
        <PageHeader title={t("title")} body={t("signedOut")} />
      </section>
    );
  }

  const actor = process.env.DATABASE_URL
    ? await getActorContext(session.user.id)
    : null;
  const displayName = session.user.name ?? session.user.email ?? "Member";
  const roleLabel = actor?.roles.includes("entertainer")
    ? t("roleEntertainer")
    : actor?.roles.includes("venue")
      ? t("roleVenue")
      : t("roleNone");

  return (
    <section className="mx-auto grid max-w-2xl gap-8">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={displayName} src={session.user.image} size={56} />
        <div>
          <PageHeader
            eyebrow={t("eyebrow")}
            title={t("title")}
            body={t("body")}
          />
        </div>
      </div>

      <div className="panel grid gap-5 p-6">
        <h2 className="text-base font-semibold text-[var(--ink)]">
          {t("identityTitle")}
        </h2>
        <dl className="grid gap-4 text-sm">
          <div>
            <dt className="font-medium text-[var(--ink)]">
              {t("displayName")}
            </dt>
            <dd className="mt-1 text-[var(--text-muted)]">{displayName}</dd>
          </div>
          <div>
            <dt className="font-medium text-[var(--ink)]">{t("email")}</dt>
            <dd className="mt-1 text-[var(--text-muted)]">
              {session.user.email ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-[var(--ink)]">
              {t("accountType")}
            </dt>
            <dd className="mt-1 text-[var(--text-muted)]">{roleLabel}</dd>
          </div>
          <div>
            <dt className="font-medium text-[var(--ink)]">{t("status")}</dt>
            <dd className="mt-2">
              <StatusLabel>{session.user.accountStatus ?? "—"}</StatusLabel>
            </dd>
          </div>
        </dl>
      </div>

      <div className="panel grid gap-4 p-6">
        <h2 className="text-base font-semibold text-[var(--ink)]">
          {t("languageTitle")}
        </h2>
        <p className="text-sm text-[var(--text-muted)]">{t("languageBody")}</p>
        <LocaleSwitcher />
      </div>

      <AccountDeletionSection userEmail={session.user.email ?? ""} />
    </section>
  );
}
