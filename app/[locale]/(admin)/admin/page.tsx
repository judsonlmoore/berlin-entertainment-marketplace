import { desc } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/src/auth";
import { ApprovalForm } from "@/src/components/approval-form";
import { getDb } from "@/src/db/client";
import { getActorContext } from "@/src/db/queries/actor";
import { marketplaceAccounts } from "@/src/db/schema/marketplace";
import { users } from "@/src/db/schema";
import { can } from "@/src/domain/permissions";
import type { ApprovalState } from "@/src/domain/approval";
import { eq } from "drizzle-orm";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const status = await getTranslations("status");
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <section>
        <h1 className="display text-4xl">{t("title")}</h1>
        <p className="mt-4">{t("denied")}</p>
      </section>
    );
  }

  if (!process.env.DATABASE_URL) {
    return (
      <section>
        <h1 className="display text-4xl">{t("title")}</h1>
        <p className="mt-4">DATABASE_URL is not configured.</p>
      </section>
    );
  }

  const actor = await getActorContext(session.user.id);
  if (!actor || !can(actor, "admin.review_accounts")) {
    return (
      <section>
        <h1 className="display text-4xl">{t("title")}</h1>
        <p className="mt-4">{t("denied")}</p>
      </section>
    );
  }

  const db = getDb();
  const accounts = await db
    .select({
      id: marketplaceAccounts.id,
      approvalState: marketplaceAccounts.approvalState,
      berlinConnection: marketplaceAccounts.berlinConnection,
      reviewReason: marketplaceAccounts.reviewReason,
      userName: users.name,
      userEmail: users.email,
    })
    .from(marketplaceAccounts)
    .innerJoin(users, eq(users.id, marketplaceAccounts.userId))
    .orderBy(desc(marketplaceAccounts.createdAt));

  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="display text-4xl">{t("title")}</h1>
      <p className="mt-4 text-[var(--muted)]">{t("body")}</p>

      <div className="mt-8 grid gap-4">
        {accounts.length === 0 ? (
          <p className="panel p-6">{t("empty")}</p>
        ) : null}
        {accounts.map((account) => (
          <article key={account.id} className="panel p-6">
            <h2 className="text-xl font-semibold">
              {account.userName ?? "Unnamed"}
            </h2>
            <p className="text-sm text-[var(--muted)]">{account.userEmail}</p>
            <p className="mt-2 text-sm">
              {status(account.approvalState as ApprovalState)}
            </p>
            {account.berlinConnection ? (
              <p className="mt-2 text-sm">{account.berlinConnection}</p>
            ) : null}
            <ApprovalForm
              locale={locale as "en" | "de"}
              marketplaceAccountId={account.id}
              currentState={account.approvalState as ApprovalState}
            />
          </article>
        ))}
      </div>
    </section>
  );
}
