"use server";

import { signIn, signOut } from "@/src/auth";
import type { AppLocale } from "@/src/i18n/routing";
import type { AuthProviderId } from "@/src/validation/env";

export async function signInWithProvider(
  provider: AuthProviderId,
  locale: AppLocale = "en",
) {
  await signIn(provider, {
    redirectTo: `/${locale}/onboarding/role-selection`,
  });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/en" });
}
