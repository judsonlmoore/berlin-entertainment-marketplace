"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/src/i18n/navigation";
import { Avatar } from "@/src/components/ui/monogram";
import { signOutAction } from "@/src/actions/auth";

export type AccountNavItem = {
  href: string;
  labelKey: "profile" | "admin";
  match: string;
};

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={`size-4 shrink-0 transition-transform duration-150 motion-reduce:transition-none ${
        open ? "rotate-180" : ""
      }`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 7.5l5 5 5-5" />
    </svg>
  );
}

type Props = {
  userName: string;
  userImage?: string | null | undefined;
  /** Subtitle under the name — account type (entertainer / venue). */
  accountTypeLabel: string;
  items: AccountNavItem[];
  /** Rail/drawer: open upward on dark chrome. Header: compact trigger, open downward. */
  variant?: "rail" | "header";
  onNavigate?: (() => void) | undefined;
};

export function AccountMenu({
  userName,
  userImage,
  accountTypeLabel,
  items,
  variant = "rail",
  onNavigate,
}: Props) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- close menu on route change
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (target && rootRef.current?.contains(target)) return;
      setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setOpen(false);
      buttonRef.current?.focus();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  const closeAndNavigate = () => {
    setOpen(false);
    onNavigate?.();
  };

  const isRail = variant === "rail";

  return (
    <div ref={rootRef} className={`relative ${isRail ? "w-full" : ""}`}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={t("accountMenu")}
        onClick={() => setOpen((current) => !current)}
        className={
          isRail
            ? `flex min-h-11 w-full items-center gap-3 rounded-[var(--radius-md)] px-2 py-2 text-left transition-colors duration-150 motion-reduce:transition-none ${
                open
                  ? "bg-[var(--rail-active)] text-white"
                  : "text-white hover:bg-white/10"
              }`
            : `inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-md)] border px-2 py-1.5 transition-colors duration-150 motion-reduce:transition-none ${
                open
                  ? "border-[var(--primary)] bg-[var(--canvas)] text-[var(--ink)]"
                  : "border-[var(--rule)] text-[var(--ink)] hover:bg-[var(--canvas)]"
              }`
        }
      >
        <Avatar name={userName} src={userImage} size={isRail ? 40 : 28} />
        {isRail ? (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-white">
                {userName}
              </span>
              <span className="block truncate text-xs text-[var(--rail-muted)]">
                {accountTypeLabel}
              </span>
            </span>
            <ChevronIcon open={open} />
          </>
        ) : (
          <ChevronIcon open={open} />
        )}
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={t("accountMenu")}
          className={`absolute z-50 min-w-[12.5rem] rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface)] py-1 text-[var(--ink)] shadow-sm ${
            isRail ? "right-0 bottom-full left-0 mb-2" : "top-full right-0 mt-2"
          }`}
        >
          {items.map((item) => {
            const active = new RegExp(item.match).test(pathname);
            return (
              <Link
                key={`${item.labelKey}-${item.href}`}
                href={item.href}
                role="menuitem"
                onClick={closeAndNavigate}
                className={`flex min-h-11 items-center px-3 text-sm no-underline transition-colors duration-150 ${
                  active
                    ? "bg-[var(--canvas)] font-semibold text-[var(--primary)]"
                    : "font-medium text-[var(--ink)] hover:bg-[var(--canvas)]"
                }`}
              >
                {t(item.labelKey)}
              </Link>
            );
          })}
          <div className="my-1 border-t border-[var(--rule)]" />
          <form action={signOutAction}>
            <button
              type="submit"
              role="menuitem"
              className="flex min-h-11 w-full items-center px-3 text-left text-sm font-medium text-[var(--ink)] transition-colors duration-150 hover:bg-[var(--canvas)]"
            >
              {t("signOut")}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
