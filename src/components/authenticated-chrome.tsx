import { getTranslations } from "next-intl/server";
import { AppShell } from "@/src/components/app-shell";

type Props = {
  children: React.ReactNode;
  locale: string;
  userName: string;
  approvalState: string | null;
  isStaff: boolean;
  isApproved: boolean;
  canDiscoverEntertainers: boolean;
  canDiscoverVenues: boolean;
};

export async function AuthenticatedChrome({
  children,
  userName,
  approvalState,
  isStaff,
  isApproved,
  canDiscoverEntertainers,
  canDiscoverVenues,
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
      userName={userName || "Member"}
      approvalLabel={approvalLabel}
      isStaff={isStaff}
      isApproved={isApproved}
      canDiscoverEntertainers={canDiscoverEntertainers}
      canDiscoverVenues={canDiscoverVenues}
    >
      {children}
    </AppShell>
  );
}
