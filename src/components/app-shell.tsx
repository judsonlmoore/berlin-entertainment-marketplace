"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/src/i18n/navigation";
import {
  AccountMenu,
  type AccountNavItem,
} from "@/src/components/account-menu";
import { OnboardingChecklistRail } from "@/src/components/onboarding-checklist-rail";
import { RailRoleContext } from "@/src/components/rail-role-context";
import type { OnboardingChecklistView } from "@/src/domain/onboarding-checklist";
import type { RailRoleContextData } from "@/src/lib/rail-role-context";

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
    | "requests";
  match: string;
};

function isActive(pathname: string, match: string) {
  return new RegExp(match).test(pathname);
}

type Props = {
  children: ReactNode;
  locale: "en" | "de";
  userName: string;
  userImage?: string | null | undefined;
  isStaff: boolean;
  isApproved: boolean;
  canDiscoverEntertainers: boolean;
  canDiscoverVenues: boolean;
  roleContext?: RailRoleContextData | null;
  onboardingChecklist?: OnboardingChecklistView | null;
  supportBanner?: ReactNode;
};

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      {open ? (
        <>
          <path d="M6 6l12 12" />
          <path d="M18 6L6 18" />
        </>
      ) : (
        <>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </>
      )}
    </svg>
  );
}

function RailNav({
  items,
  accountItems,
  pathname,
  userName,
  userImage,
  accountTypeLabel,
  roleContext,
  onboardingChecklist,
  locale,
  navId,
  onNavigate,
}: {
  items: NavItem[];
  accountItems: AccountNavItem[];
  pathname: string;
  userName: string;
  userImage?: string | null | undefined;
  accountTypeLabel: string;
  roleContext?: RailRoleContextData | null;
  onboardingChecklist?: OnboardingChecklistView | null;
  locale: "en" | "de";
  navId?: string;
  onNavigate?: () => void;
}) {
  const t = useTranslations("nav");

  return (
    <>
      <Link
        href="/marketplace"
        className="display text-3xl font-medium no-underline"
        onClick={onNavigate}
      >
        Salon
      </Link>
      {roleContext ? (
        <RailRoleContext
          mode={roleContext.mode}
          label={roleContext.label}
          canSwitch={roleContext.canSwitch}
          otherMode={roleContext.otherMode}
          locale={locale}
          onNavigate={onNavigate}
        />
      ) : null}
      {onboardingChecklist ? (
        <OnboardingChecklistRail checklist={onboardingChecklist} />
      ) : null}
      <nav
        id={navId}
        aria-label={t("primary")}
        className="mt-8 grid flex-1 content-start gap-1 overflow-y-auto"
      >
        {items.map((item) => {
          const active = isActive(pathname, item.match);
          return (
            <Link
              key={`${item.labelKey}-${item.href}`}
              href={item.href}
              onClick={onNavigate}
              className={`min-h-11 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium no-underline ${
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
        <AccountMenu
          userName={userName}
          userImage={userImage}
          accountTypeLabel={accountTypeLabel}
          items={accountItems}
          onNavigate={onNavigate}
        />
      </div>
    </>
  );
}

export function AppShell({
  children,
  locale,
  userName,
  userImage,
  isStaff,
  isApproved,
  canDiscoverEntertainers,
  canDiscoverVenues,
  roleContext = null,
  onboardingChecklist = null,
  supportBanner = null,
}: Props) {
  const t = useTranslations("nav");
  const tRole = useTranslations("roleMode");
  const pathname = usePathname();
  const drawerTitleId = useId();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const toggleMenu = useCallback(() => setMenuOpen((open) => !open), []);

  const accountTypeLabel = roleContext
    ? tRole(
        roleContext.mode === "entertainer" ? "entertainerMode" : "venueMode",
      )
    : isStaff
      ? t("admin")
      : "";

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

  const items = mainNav.filter(
    (item) => isApproved || isStaff || item.labelKey === "overview",
  );

  const accountItems: AccountNavItem[] = [
    { href: "/account", labelKey: "account", match: "/account" },
    ...(isStaff
      ? [
          {
            href: "/admin/accounts",
            labelKey: "superAdmin" as const,
            match: "/admin/accounts",
          },
          { href: "/admin", labelKey: "admin" as const, match: "^/admin$" },
        ]
      : []),
  ];

  // Close mobile menu when navigating to a new page
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    closeMenu();
  }, [pathname, closeMenu]);

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        menuButtonRef.current?.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const firstLink =
      drawerRef.current?.querySelector<HTMLElement>("a, button");
    firstLink?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen, closeMenu]);

  const mobileContextLabel =
    roleContext?.label?.trim() ||
    (roleContext
      ? roleContext.mode === "entertainer"
        ? tRole("entertainerMode")
        : tRole("venueMode")
      : null);

  return (
    <div className="min-h-screen bg-[var(--canvas)] lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="hidden bg-[var(--rail)] text-[var(--primary-foreground)] lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:px-5 lg:py-6">
        <RailNav
          items={items}
          accountItems={accountItems}
          pathname={pathname}
          userName={userName}
          userImage={userImage}
          accountTypeLabel={accountTypeLabel}
          roleContext={roleContext}
          onboardingChecklist={onboardingChecklist}
          locale={locale}
        />
      </aside>

      <div
        className={`fixed inset-0 z-40 lg:hidden ${
          menuOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!menuOpen}
      >
        <button
          type="button"
          tabIndex={menuOpen ? 0 : -1}
          className={`absolute inset-0 bg-[var(--rail)]/50 transition-opacity duration-200 motion-reduce:transition-none ${
            menuOpen ? "opacity-100" : "opacity-0"
          }`}
          aria-label={t("closeMenu")}
          onClick={() => {
            closeMenu();
            menuButtonRef.current?.focus();
          }}
        />
        <div
          ref={drawerRef}
          id="mobile-nav-drawer"
          role="dialog"
          aria-modal={menuOpen}
          aria-labelledby={drawerTitleId}
          inert={menuOpen ? undefined : true}
          className={`absolute inset-y-0 left-0 flex w-[min(20rem,88vw)] flex-col bg-[var(--rail)] px-5 py-6 text-[var(--primary-foreground)] shadow-xl transition-transform duration-200 ease-out motion-reduce:transition-none ${
            menuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <p id={drawerTitleId} className="sr-only">
              {t("menu")}
            </p>
            <button
              type="button"
              tabIndex={menuOpen ? 0 : -1}
              onClick={() => {
                closeMenu();
                menuButtonRef.current?.focus();
              }}
              className="ml-auto inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-md)] text-white"
              aria-label={t("closeMenu")}
            >
              <MenuIcon open />
            </button>
          </div>
          <RailNav
            items={items}
            accountItems={accountItems}
            pathname={pathname}
            userName={userName}
            userImage={userImage}
            accountTypeLabel={accountTypeLabel}
            roleContext={roleContext}
            onboardingChecklist={onboardingChecklist}
            locale={locale}
            onNavigate={closeMenu}
          />
        </div>
      </div>

      <div className="flex min-h-screen flex-col">
        {supportBanner}
        {/* Mobile-only chrome: menu + role context + account. No desktop top bar. */}
        <div className="sticky top-0 z-20 flex min-h-14 items-center justify-between gap-3 border-b border-[var(--rule)] bg-[var(--canvas)] px-4 py-2 sm:px-6 lg:hidden">
          <button
            ref={menuButtonRef}
            type="button"
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface)] text-[var(--ink)]"
            aria-label={menuOpen ? t("closeMenu") : t("openMenu")}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-drawer"
            onClick={toggleMenu}
          >
            <MenuIcon open={menuOpen} />
          </button>
          {roleContext && mobileContextLabel ? (
            <Link
              href="/profile"
              className="flex min-w-0 flex-1 items-center gap-2 no-underline"
              aria-label={tRole("editProfileAria", {
                name: mobileContextLabel,
              })}
            >
              <span className="inline-flex shrink-0 items-center rounded-[var(--radius-sm)] border border-[var(--rule)] bg-[var(--surface)] px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-[0.1em] text-[var(--ink)] uppercase">
                {roleContext.mode === "entertainer"
                  ? tRole("actBadge")
                  : tRole("venueBadge")}
              </span>
              <span className="min-w-0 truncate text-sm font-medium text-[var(--ink)]">
                {mobileContextLabel}
              </span>
              <span className="shrink-0 text-xs font-medium text-[var(--text-muted)]">
                {t("editProfile")}
              </span>
            </Link>
          ) : (
            <div className="flex-1" />
          )}
          <AccountMenu
            userName={userName}
            userImage={userImage}
            accountTypeLabel={accountTypeLabel}
            items={accountItems}
            variant="header"
          />
        </div>

        <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
