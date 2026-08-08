"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string | null;
  /** Accessible name override; defaults to title. */
  ariaLabel?: string;
  closeLabel?: string;
  children: ReactNode;
  /** Sticky bottom actions (primary CTAs). */
  footer?: ReactNode;
  /** Optional wider desktop panel (e.g. video). */
  size?: "md" | "lg";
  /** Danger styling for destructive dialogs. */
  dangerTitle?: boolean;
};

/**
 * App modal / sheet.
 * Desktop: centered panel with radius.
 * Mobile: edge-to-edge screen, no radius, sticky close (top) + CTA (bottom).
 */
export function AppModal({
  open,
  onClose,
  title,
  subtitle,
  ariaLabel,
  closeLabel = "Close",
  children,
  footer,
  size = "md",
  dangerTitle = false,
}: Props) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Focus close only when the dialog opens — not when parent re-renders with a
  // new onClose identity (e.g. typing in a controlled confirmation field).
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!open) return null;

  const maxWidth = size === "lg" ? "md:max-w-3xl" : "md:max-w-lg";

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-[rgba(20,24,22,0.55)] md:items-center md:p-4"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-label={ariaLabel}
        className={`flex h-dvh w-full flex-col overflow-hidden rounded-none border-0 bg-[var(--surface)] shadow-none md:h-auto md:max-h-[min(90dvh,52rem)] md:rounded-[var(--radius-lg)] md:border md:border-[var(--rule)] md:shadow-xl ${maxWidth}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex shrink-0 items-start justify-between gap-3 border-b border-[var(--rule)] bg-[var(--surface)] px-4 py-3 sm:px-5">
          <div className="min-w-0 pt-1">
            <h2
              id={titleId}
              className={`page-title text-xl ${
                dangerTitle ? "text-[var(--danger)]" : ""
              }`}
            >
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface)] text-[var(--ink)]"
            aria-label={closeLabel}
          >
            <span aria-hidden="true" className="text-lg leading-none">
              ×
            </span>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          {children}
        </div>

        {footer ? (
          <footer className="sticky bottom-0 z-10 shrink-0 border-t border-[var(--rule)] bg-[var(--surface)] px-4 py-3 sm:px-5">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
