"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/src/i18n/navigation";
import { LocaleSwitcher } from "@/src/components/locale-switcher";
import { Avatar } from "@/src/components/ui/monogram";
import { PendingSubmitButton } from "@/src/components/pending-submit-button";
import { signOutAction } from "@/src/actions/auth";

type NavItem = {
  href: string;
  labelKey:
    | "overview"
    | "discover"
    | "discoverActs"
    | "discoverVenues"
    | "opportunities"
    | "bookings"
    | "calendar"
    | "requests"
    | "profile"
    | "onboarding"
    | "admin";
  match: string;
};

function isActive(pathname: string, match: string) {
  return new RegExp(match).test(pathname);
}

type Props = {
  children: React.ReactNode;
  userName: string;
  approvalLabel: string;
  isStaff: boolean;
  isApproved: boolean;
  canDiscoverEntertainers: boolean;
  canDiscoverVenues: boolean;
};

function breadcrumbKeyFromPath(
  pathname: string,
): NavItem["labelKey"] | "marketplace" {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/onboarding")) return "onboarding";
  if (pathname.startsWith("/profile")) return "profile";
  if (pathname.includes("/opportunities")) return "opportunities";
  if (pathname.includes("/bookings")) return "bookings";
  if (pathname.includes("/calendar")) return "calendar";
  if (pathname.includes("/requests")) return "requests";
  if (pathname.includes("/entertainers")) return "discoverActs";
  if (pathname.includes("/venues")) return "discoverVenues";
  return "marketplace";
}

export function AppShell({
  children,
  userName,
  approvalLabel,
  isStaff,
  isApproved,
  canDiscoverEntertainers,
  canDiscoverVenues,
}: Props) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const breadcrumbKey = breadcrumbKeyFromPath(pathname);

  const discoverItems: NavItem[] = [];
  if (canDiscoverEntertainers && canDiscoverVenues) {
    discoverItems.push({
      href: "/marketplace/entertainers",
      labelKey: "discoverActs",
      match: "/marketplace/entertainers",
    });
    discoverItems.push({
      href: "/marketplace/venues",
      labelKey: "discoverVenues",
      match: "/marketplace/venues",
    });
  } else if (canDiscoverEntertainers) {
    discoverItems.push({
      href: "/marketplace/entertainers",
      labelKey: "discover",
      match: "/marketplace/entertainers",
    });
  } else if (canDiscoverVenues) {
    discoverItems.push({
      href: "/marketplace/venues",
      labelKey: "discover",
      match: "/marketplace/venues",
    });
  }

  const mainNav: NavItem[] = [
    { href: "/marketplace", labelKey: "overview", match: "/marketplace$" },
    ...discoverItems,
    {
      href: "/marketplace/opportunities",
      labelKey: "opportunities",
      match: "/marketplace/opportunities",
    },
    {
      href: "/marketplace/bookings",
      labelKey: "bookings",
      match: "/marketplace/bookings",
    },
    {
      href: "/marketplace/calendar",
      labelKey: "calendar",
      match: "/marketplace/calendar",
    },
    {
      href: "/marketplace/requests",
      labelKey: "requests",
      match: "/marketplace/requests",
    },
  ];

  const items = [
    ...mainNav.filter(
      (item) => isApproved || isStaff || item.labelKey === "overview",
    ),
    { href: "/profile", labelKey: "profile" as const, match: "/profile" },
    {
      href: "/onboarding",
      labelKey: "onboarding" as const,
      match: "/onboarding",
    },
    ...(isStaff
      ? [{ href: "/admin", labelKey: "admin" as const, match: "/admin" }]
      : []),
  ];

  const bottomKeys = new Set([
    "overview",
    "discover",
    "discoverActs",
    "discoverVenues",
    "opportunities",
    "bookings",
    "calendar",
  ]);
  const bottomItems = items
    .filter((item) => bottomKeys.has(item.labelKey))
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-[var(--canvas)] lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="hidden bg-[var(--rail)] text-[var(--primary-foreground)] lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:px-5 lg:py-6">
        <Link href="/marketplace" className="display text-3xl no-underline">
          Salon
        </Link>
        <p className="mt-2 text-xs tracking-[0.14em] text-[var(--rail-muted)] uppercase">
          Berlin
        </p>
        <nav aria-label={t("primary")} className="mt-10 grid gap-1">
          {items.map((item) => {
            const active = isActive(pathname, item.match);
            return (
              <Link
                key={`${item.labelKey}-${item.href}`}
                href={item.href}
                className={`min-h-11 px-3 py-2.5 text-sm no-underline ${
                  active
                    ? "bg-[var(--rail-active)] text-white"
                    : "text-[var(--rail-muted)] hover:text-white"
                }`}
              >
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-white/10 pt-4">
          <div className="flex items-center gap-3">
            <Avatar name={userName} size={40} />
            <div className="min-w-0">
              <p className="truncate text-sm text-white">{userName}</p>
              <p className="text-xs text-[var(--rail-muted)]">
                {approvalLabel}
              </p>
            </div>
          </div>
          <form action={signOutAction} className="mt-3">
            <PendingSubmitButton
              variant="ghost"
              className="w-full justify-start text-[var(--rail-muted)]"
            >
              {t("signOut")}
            </PendingSubmitButton>
          </form>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col pb-20 lg:pb-0">
        <header className="sticky top-0 z-20 border-b border-[var(--rule)] bg-[var(--surface)]">
          <div className="flex min-h-[72px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-10">
            <p className="text-xs tracking-[0.14em] text-[var(--text-muted)] uppercase">
              {`Salon / ${t(breadcrumbKey)}`}
            </p>
            <div className="flex items-center gap-2">
              <LocaleSwitcher className="border-[var(--rule)]" />
              <Link
                href="/profile"
                className="inline-flex min-h-11 min-w-11 items-center justify-center border border-[var(--rule)] no-underline lg:hidden"
                aria-label={t("profile")}
              >
                <Avatar name={userName} size={28} />
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </main>

        <nav
          aria-label={t("mobile")}
          className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--rule)] bg-[var(--surface)] pb-[env(safe-area-inset-bottom)] lg:hidden"
        >
          <ul className="grid grid-cols-5">
            {bottomItems.map((item) => {
              const active = isActive(pathname, item.match);
              return (
                <li key={`${item.labelKey}-${item.href}`}>
                  <Link
                    href={item.href}
                    className={`flex min-h-14 flex-col items-center justify-center px-1 text-center text-[0.65rem] no-underline ${
                      active
                        ? "text-[var(--primary)]"
                        : "text-[var(--text-muted)]"
                    }`}
                  >
                    {t(item.labelKey)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
