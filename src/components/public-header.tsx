import { getTranslations } from "next-intl/server";
import { Link } from "@/src/i18n/navigation";
import { LocaleSwitcher } from "@/src/components/locale-switcher";
import { PendingSubmitButton } from "@/src/components/pending-submit-button";
import { signOutAction } from "@/src/actions/auth";

type Props = {
  signedIn: boolean;
  /** Signed-in users who still need XOR role selection. */
  showApplyCta?: boolean;
};

export async function PublicHeader({ signedIn, showApplyCta = true }: Props) {
  const t = await getTranslations("nav");
  const brand = await getTranslations("brand");

  return (
    <header className="border-b border-[var(--rule)] bg-[var(--surface)]">
      <div className="shell flex min-h-[72px] items-center justify-between gap-4 py-4">
        <Link href="/" className="display text-2xl leading-none no-underline">
          {brand("name")}
        </Link>
        <nav
          aria-label={t("primary")}
          className="flex flex-wrap items-center gap-2 sm:gap-3"
        >
          <LocaleSwitcher />
          {signedIn ? (
            <>
              {showApplyCta ? (
                <Link
                  href="/onboarding/role-selection"
                  className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] no-underline"
                >
                  {t("applyAccess")}
                </Link>
              ) : (
                <Link
                  href="/marketplace"
                  className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] px-3 py-2 text-sm font-semibold no-underline"
                >
                  {t("marketplace")}
                </Link>
              )}
              <form action={signOutAction}>
                <PendingSubmitButton variant="ghost">
                  {t("signOut")}
                </PendingSubmitButton>
              </form>
            </>
          ) : (
            <Link
              href="/sign-in"
              className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] no-underline"
            >
              {t("signIn")}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
