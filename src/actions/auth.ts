"use server";

import { signIn, signOut } from "@/src/auth";
import type { AppLocale } from "@/src/i18n/routing";

export async function signInWithProvider(
  provider: "github" | "google",
  locale: AppLocale = "en",
) {
  await signIn(provider, {
    redirectTo: `/${locale}/onboarding/role-selection`,
  });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/en" });
}
