import { AppShell } from "@/src/components/app-shell";
import type { RailRoleContextData } from "@/src/lib/rail-role-context";

type Props = {
  children: React.ReactNode;
  locale: string;
  userName: string;
  userImage?: string | null | undefined;
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
  isStaff,
  isApproved,
  canDiscoverEntertainers,
  canDiscoverVenues,
  roleContext = null,
}: Props) {
  return (
    <AppShell
      locale={locale as "en" | "de"}
      userName={userName || "Member"}
      userImage={userImage}
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
