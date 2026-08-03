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
  children: ReactNode;
  userName: string;
  userImage?: string | null;
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
  pathname,
  userName,
  userImage,
  approvalLabel,
  navId,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  userName: string;
  userImage?: string | null;
  approvalLabel: string;
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
      <p className="mt-2 text-xs tracking-[0.14em] text-[var(--rail-muted)] uppercase">
        Berlin
      </p>
      <nav
        id={navId}
        aria-label={t("primary")}
        className="mt-10 grid flex-1 content-start gap-1 overflow-y-auto"
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
        <div className="flex items-center gap-3">
          <Avatar name={userName} src={userImage} size={40} />
          <div className="min-w-0">
            <p className="truncate text-sm text-white">{userName}</p>
            <p className="text-xs text-[var(--rail-muted)]">{approvalLabel}</p>
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
    </>
  );
}

export function AppShell({
  children,
  userName,
  userImage,
  approvalLabel,
  isStaff,
  isApproved,
  canDiscoverEntertainers,
  canDiscoverVenues,
}: Props) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const breadcrumbKey = breadcrumbKeyFromPath(pathname);
  const drawerTitleId = useId();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const toggleMenu = useCallback(() => setMenuOpen((open) => !open), []);

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

  return (
    <div className="min-h-screen bg-[var(--canvas)] lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="hidden bg-[var(--rail)] text-[var(--primary-foreground)] lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:px-5 lg:py-6">
        <RailNav
          items={items}
          pathname={pathname}
          userName={userName}
          userImage={userImage}
          approvalLabel={approvalLabel}
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
            pathname={pathname}
            userName={userName}
            userImage={userImage}
            approvalLabel={approvalLabel}
            onNavigate={closeMenu}
          />
        </div>
      </div>

      <div className="flex min-h-screen flex-col pb-20 lg:pb-0">
        <header className="sticky top-0 z-20 border-b border-[var(--rule)] bg-[var(--surface)]">
          <div className="flex min-h-[72px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-10">
            <div className="flex min-w-0 items-center gap-2">
              <button
                ref={menuButtonRef}
                type="button"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--rule)] text-[var(--ink)] lg:hidden"
                aria-label={menuOpen ? t("closeMenu") : t("openMenu")}
                aria-expanded={menuOpen}
                aria-controls="mobile-nav-drawer"
                onClick={toggleMenu}
              >
                <MenuIcon open={menuOpen} />
              </button>
              <p className="truncate text-xs tracking-[0.14em] text-[var(--text-muted)] uppercase">
                {`Salon / ${t(breadcrumbKey)}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <LocaleSwitcher className="border-[var(--rule)]" />
              <Link
                href="/profile"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--rule)] no-underline lg:hidden"
                aria-label={t("profile")}
              >
                <Avatar name={userName} src={userImage} size={28} />
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
                    className={`flex min-h-14 flex-col items-center justify-center px-1 text-center text-[0.65rem] font-medium no-underline ${
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
