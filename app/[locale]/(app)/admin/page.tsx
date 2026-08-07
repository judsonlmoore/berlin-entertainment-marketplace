import { redirect } from "@/src/i18n/navigation";
import type { AppLocale } from "@/src/i18n/routing";

type Props = {
  params: Promise<{ locale: string }>;
};

/** Staff landing: Super admin account search / support sessions. */
export default async function AdminIndexPage({ params }: Props) {
  const { locale } = await params;
  redirect({ href: "/admin/accounts", locale: locale as AppLocale });
}
