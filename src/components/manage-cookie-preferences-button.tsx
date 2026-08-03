"use client";

import * as CookieConsent from "vanilla-cookieconsent";

type Props = {
  label: string;
};

export function ManageCookiePreferencesButton({ label }: Props) {
  return (
    <button
      type="button"
      className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)] px-4 text-sm font-medium text-[var(--primary-foreground)]"
      onClick={() => {
        CookieConsent.showPreferences();
      }}
    >
      {label}
    </button>
  );
}
