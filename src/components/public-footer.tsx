import { getTranslations } from "next-intl/server";
import { Link } from "@/src/i18n/navigation";

export async function PublicFooter() {
  const t = await getTranslations("home");

  return (
    <footer className="mt-auto border-t border-[var(--rule)] bg-[var(--canvas)]">
      <div className="shell flex flex-col gap-3 py-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="display text-2xl">Salon</p>
          <p className="mt-2 max-w-md text-sm font-medium text-[var(--text-muted)]">
            {t("footerNote")}
          </p>
        </div>
        <nav aria-label={t("footerNavLabel")} className="text-sm font-medium">
          <Link href="/help">{t("footerHelp")}</Link>
          {" · "}
          <Link href="/contact">{t("footerContact")}</Link>
          {" · "}
          <Link href="/privacy">{t("footerLegal")}</Link>
          {" · "}
          <Link href="/terms">{t("footerTerms")}</Link>
          {" · "}
          <Link href="/cookies">{t("footerCookies")}</Link>
          {" · "}
          <Link href="/sign-in">{t("ctaSignIn")}</Link>
        </nav>
      </div>
    </footer>
  );
}
