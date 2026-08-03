"use server";

import { signIn, signOut } from "@/src/auth";

export async function signInWithProvider(provider: "github" | "google") {
  await signIn(provider, { redirectTo: "/en/onboarding" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/en" });
}
