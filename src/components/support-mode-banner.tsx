import { getTranslations } from "next-intl/server";
import { StopSupportButton } from "@/src/components/support-session-controls";
import { Link } from "@/src/i18n/navigation";
import type { SupportSessionPayload } from "@/src/lib/support-session";

type Props = {
  locale: "en" | "de";
  support: SupportSessionPayload;
};

export async function SupportModeBanner({ locale, support }: Props) {
  const t = await getTranslations("adminSupport");
  const entityLabel =
    support.entityType === "entertainer"
      ? t("entityEntertainer")
      : t("entityVenue");

  return (
    <div
      role="status"
      className="border-b border-[color-mix(in_srgb,#b8842a_35%,var(--rule))] bg-[var(--warning-soft)] px-4 py-3 text-[var(--ink)]"
    >
      <div className="mx-auto flex max-w-[1480px] flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium">
          {t("banner", {
            label: support.label,
            entityType: entityLabel,
          })}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/accounts"
            className="text-sm font-semibold text-[var(--ink)] underline-offset-2 hover:underline"
          >
            {t("superAdmin")}
          </Link>
          <StopSupportButton locale={locale} />
        </div>
      </div>
    </div>
  );
}
