import { getTranslations } from "next-intl/server";
import { Link } from "@/src/i18n/navigation";
import { LocaleSwitcher } from "@/src/components/locale-switcher";
import { PendingSubmitButton } from "@/src/components/pending-submit-button";
import { signOutAction } from "@/src/actions/auth";

type Props = {
  signedIn: boolean;
  showApplyCta?: boolean;
};

export async function PublicHeader({ signedIn, showApplyCta = true }: Props) {
  const t = await getTranslations("nav");
  const brand = await getTranslations("brand");

  return (
    <header className="border-b border-[var(--rule)] bg-[var(--canvas)]">
      <div className="shell flex min-h-[72px] items-center justify-between gap-4 py-4">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <span
            aria-hidden="true"
            className="inline-flex size-8 items-center justify-center rounded-full bg-[var(--ink)] text-sm text-[var(--primary-foreground)]"
          >
            S
          </span>
          <span className="display text-2xl leading-none">
            {brand("name")}
            <span className="ml-1 font-sans text-xs font-semibold tracking-[0.14em] text-[var(--text-muted)] uppercase">
              {brand("city")}
            </span>
          </span>
        </Link>
        <nav
          aria-label={t("primary")}
          className="flex flex-wrap items-center gap-2 sm:gap-3"
        >
          <LocaleSwitcher />
          {signedIn ? (
            <>
              <Link
                href="/marketplace"
                className="min-h-11 px-3 py-2 text-sm no-underline"
              >
                {t("marketplace")}
              </Link>
              <form action={signOutAction}>
                <PendingSubmitButton variant="ghost">
                  {t("signOut")}
                </PendingSubmitButton>
              </form>
            </>
          ) : (
            <Link
              href="/sign-in"
              className="min-h-11 px-3 py-2 text-sm no-underline"
            >
              {t("signIn")}
            </Link>
          )}
          {showApplyCta ? (
            <Link
              href="/apply"
              className="inline-flex min-h-11 items-center bg-[var(--primary)] px-4 py-2.5 text-sm text-[var(--primary-foreground)] no-underline"
            >
              {t("applyAccess")}
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
