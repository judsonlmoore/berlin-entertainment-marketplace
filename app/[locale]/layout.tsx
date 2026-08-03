import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { SiteHeader } from "@/src/components/site-header";
import { auth } from "@/src/auth";
import { routing } from "@/src/i18n/routing";

export const dynamic = "force-dynamic";

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const session = await auth();

  return (
    <NextIntlClientProvider messages={messages}>
      <div className="min-h-screen">
        <SiteHeader
          locale={locale}
          signedIn={Boolean(session?.user)}
          isStaff={Boolean(session?.user?.isPlatformStaff)}
          isApproved={session?.user?.approvalState === "approved"}
        />
        <main className="shell py-10">{children}</main>
      </div>
    </NextIntlClientProvider>
  );
}
