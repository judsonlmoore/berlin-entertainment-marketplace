import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/src/auth";
import { RoleSelectionForm } from "@/src/components/role-selection-form";

type Props = { params: Promise<{ locale: string }> };

export default async function RoleSelectionPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("roleSelection");
  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/sign-in`);
  }

  if (session.user.activeRoleMode) {
    redirect(`/${locale}/onboarding`);
  }

  return (
    <section className="mx-auto max-w-2xl">
      <h1 className="page-title text-[clamp(1.75rem,2.5vw,2.5rem)]">
        {t("title")}
      </h1>
      <p className="mt-4 font-medium text-[var(--text-muted)]">{t("body")}</p>
      <div className="panel mt-8 p-6">
        <RoleSelectionForm locale={locale as "en" | "de"} />
      </div>
    </section>
  );
}
