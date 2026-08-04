import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/src/i18n/navigation";
import { auth } from "@/src/auth";
import { RoleSelectionForm } from "@/src/components/role-selection-form";
import { resolveOnboardingDestination } from "@/src/lib/onboarding-gate";
import type { AppLocale } from "@/src/i18n/routing";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function RoleSelectionPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("roleSelection");
  const session = await auth();

  if (!session?.user?.id) {
    redirect({ href: "/sign-in", locale: locale as AppLocale });
  }

  const destination = await resolveOnboardingDestination({
    userId: session!.user!.id!,
    isPlatformStaff: Boolean(session!.user!.isPlatformStaff),
    sessionRoles: session!.user!.roles,
  });

  if (destination === "setup") {
    redirect({ href: "/onboarding/setup", locale: locale as AppLocale });
  }
  if (destination === "none") {
    redirect({ href: "/profile", locale: locale as AppLocale });
  }

  return (
    <section className="mx-auto grid max-w-lg gap-6">
      <div className="flex flex-col gap-2" aria-label="Step 1 of 3">
        <ol className="flex gap-2">
          <li className="h-1.5 flex-1 rounded-full bg-[var(--primary)]" />
          <li className="h-1.5 flex-1 rounded-full bg-[var(--rule)]" />
          <li className="h-1.5 flex-1 rounded-full bg-[var(--rule)]" />
        </ol>
        <p className="text-xs font-medium text-[var(--text-muted)]">
          {t("stepOf")}
        </p>
      </div>
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
