import { setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/src/i18n/routing";
import { redirect } from "@/src/i18n/navigation";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

/** Legacy lead detail URL — redirects to unified booking detail. */
export default async function LegacyLeadDetailRedirect({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  redirect({
    href: `/marketplace/bookings/${id}`,
    locale: locale as AppLocale,
  });
}
