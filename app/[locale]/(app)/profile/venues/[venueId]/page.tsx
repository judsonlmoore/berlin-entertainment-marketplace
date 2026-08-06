import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/src/i18n/navigation";
import type { AppLocale } from "@/src/i18n/routing";

type Props = {
  params: Promise<{ locale: string; venueId: string }>;
};

export default async function VenueDetailPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  redirect({ href: "/profile", locale: locale as AppLocale });
}
