import { getTranslations } from "next-intl/server";
import { Link } from "@/src/i18n/navigation";
import { signOutAction } from "@/src/actions/auth";

type Props = {
  locale: string;
  signedIn: boolean;
  isStaff: boolean;
  isApproved: boolean;
};

export async function SiteHeader({ signedIn, isStaff, isApproved }: Props) {
  const t = await getTranslations("nav");
  const brand = await getTranslations("brand");

  return (
    <header className="shell flex flex-wrap items-center justify-between gap-4 py-6">
      <div>
        <Link href="/" className="display text-2xl font-semibold no-underline">
          {brand("name")}
        </Link>
        <p className="mt-1 max-w-md text-sm text-[var(--muted)]">
          {brand("tagline")}
        </p>
      </div>
      <nav
        aria-label="Primary"
        className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm"
      >
        <Link href="/">{t("home")}</Link>
        <Link href="/apply">{t("apply")}</Link>
        {signedIn ? <Link href="/onboarding">{t("onboarding")}</Link> : null}
        {signedIn ? <Link href="/profile">{t("profile")}</Link> : null}
        {isApproved || isStaff ? (
          <Link href="/marketplace">{t("marketplace")}</Link>
        ) : null}
        {isStaff ? <Link href="/admin">{t("admin")}</Link> : null}
        <Link href="/privacy">{t("privacy")}</Link>
        <Link href="/terms">{t("terms")}</Link>
        {signedIn ? (
          <form action={signOutAction}>
            <button type="submit" className="underline">
              {t("signOut")}
            </button>
          </form>
        ) : (
          <Link href="/sign-in">{t("signIn")}</Link>
        )}
      </nav>
    </header>
  );
}
