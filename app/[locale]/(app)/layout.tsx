import type { ReactNode } from "react";
import { redirect } from "@/src/i18n/navigation";
import { AuthenticatedChrome } from "@/src/components/authenticated-chrome";
import { auth } from "@/src/auth";

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

/**
 * Shared authenticated shell for marketplace, profile, onboarding, and admin.
 * Keeping these under one layout preserves the rail/header across soft navigations.
 */
export default async function AppLayout({ children, params }: Props) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect({ href: "/sign-in", locale: locale as "en" | "de" });
  }

  const user = session!.user!;
  const isStaff = Boolean(user.isPlatformStaff);
  const isApproved = user.approvalState === "approved" || isStaff;

  return (
    <AuthenticatedChrome
      locale={locale}
      userName={user.name ?? user.email ?? "Member"}
      approvalState={user.approvalState}
      isStaff={isStaff}
      isApproved={isApproved}
    >
      {children}
    </AuthenticatedChrome>
  );
}
