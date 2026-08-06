import { setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/src/i18n/routing";
import { redirect } from "@/src/i18n/navigation";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Legacy Leads inbox URL — redirects to unified Bookings. */
export default async function LegacyRequestsRedirect({
  params,
  searchParams,
}: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const status = first(query.status);
  redirect({
    href: status
      ? `/marketplace/bookings?status=${encodeURIComponent(status)}`
      : "/marketplace/bookings",
    locale: locale as AppLocale,
  });
}
