import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/src/auth";
import { AdminAccountsSearch } from "@/src/components/admin-accounts-search";
import { PageHeader } from "@/src/components/ui/page-header";
import { getActorContext } from "@/src/db/queries/actor";
import { searchAdminAccounts } from "@/src/db/queries/admin-accounts";
import { can } from "@/src/domain/permissions";
import { Link } from "@/src/i18n/navigation";
import { readSupportSession } from "@/src/lib/support-session";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
};

export default async function AdminAccountsPage({
  params,
  searchParams,
}: Props) {
  const { locale } = await params;
  const { q = "" } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("adminSupport");
  const session = await auth();

  if (!session?.user?.id || !process.env.DATABASE_URL) {
    return (
      <section className="mx-auto max-w-3xl">
        <PageHeader title={t("title")} body={t("denied")} />
      </section>
    );
  }

  const actor = await getActorContext(session.user.id);
  if (!actor || !can(actor, "admin.review_accounts")) {
    return (
      <section className="mx-auto max-w-3xl">
        <PageHeader title={t("title")} body={t("denied")} />
      </section>
    );
  }

  const support = await readSupportSession(session.user.id);
  const results =
    q.trim().length >= 2 ? await searchAdminAccounts(q.trim()) : [];

  return (
    <section className="mx-auto grid max-w-3xl gap-8">
      <PageHeader title={t("title")} body={t("body")} />
      <p className="text-sm text-[var(--text-muted)]">
        <Link href="/admin" className="text-[var(--primary)]">
          {t("backToAdmin")}
        </Link>
      </p>

      {support ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--warning-soft)] px-4 py-3 text-sm">
          {t("activeSession", { label: support.label })}
        </div>
      ) : null}

      <AdminAccountsSearch
        locale={locale as "en" | "de"}
        initialQuery={q}
        results={results}
      />
    </section>
  );
}
