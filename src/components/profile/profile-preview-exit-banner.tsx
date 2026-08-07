import { getTranslations } from "next-intl/server";
import { Link } from "@/src/i18n/navigation";

type Props = {
  exitHref?: string;
};

/** Sticky strip while an owner previews their marketplace profile. */
export async function ProfilePreviewExitBanner({
  exitHref = "/profile",
}: Props) {
  const t = await getTranslations("profile");
  return (
    <div className="sticky top-14 z-20 mb-6 border border-[color-mix(in_srgb,var(--accent)_28%,var(--rule))] bg-[var(--warning-soft)] px-4 py-3 lg:top-0">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-[var(--ink)]">
          {t("previewModeBanner")}
        </p>
        <Link
          href={exitHref}
          className="inline-flex min-h-9 items-center justify-center rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--ink)] no-underline hover:bg-[var(--canvas)]"
        >
          {t("exitPreview")}
        </Link>
      </div>
    </div>
  );
}
