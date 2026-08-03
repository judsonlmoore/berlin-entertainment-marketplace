"use server";

import { signIn, signOut } from "@/src/auth";

export async function signInWithProvider(provider: "github" | "google") {
  await signIn(provider, { redirectTo: "/en/onboarding" });
}

export async function signInWithDevLogin(formData: FormData) {
  const email = String(formData.get("email") ?? "dev@salon.local");
  const name = String(formData.get("name") ?? "Salon Dev User");
  const staff = formData.get("staff") === "on" ? "true" : "false";

  await signIn("dev-login", {
    email,
    name,
    staff,
    redirectTo: "/en/onboarding",
  });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/en" });
}
