import { getTranslations } from "next-intl/server";
import { AppShell } from "@/src/components/app-shell";
import type { RailRoleContextData } from "@/src/lib/rail-role-context";

type Props = {
  children: React.ReactNode;
  locale: string;
  userName: string;
  userImage?: string | null | undefined;
  approvalState: string | null;
  isStaff: boolean;
  isApproved: boolean;
  canDiscoverEntertainers: boolean;
  canDiscoverVenues: boolean;
  roleContext?: RailRoleContextData | null;
};

export async function AuthenticatedChrome({
  children,
  locale,
  userName,
  userImage,
  approvalState,
  isStaff,
  isApproved,
  canDiscoverEntertainers,
  canDiscoverVenues,
  roleContext = null,
}: Props) {
  const approval = await getTranslations("approval");

  const approvalLabel =
    approvalState === "applied" ||
    approvalState === "invited" ||
    approvalState === "approved" ||
    approvalState === "suspended"
      ? approval(approvalState)
      : approval("unknown");

  return (
    <AppShell
      locale={locale as "en" | "de"}
      userName={userName || "Member"}
      userImage={userImage}
      approvalLabel={approvalLabel}
      isStaff={isStaff}
      isApproved={isApproved}
      canDiscoverEntertainers={canDiscoverEntertainers}
      canDiscoverVenues={canDiscoverVenues}
      roleContext={roleContext}
    >
      {children}
    </AppShell>
  );
}
