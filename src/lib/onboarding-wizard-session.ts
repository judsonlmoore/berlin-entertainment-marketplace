/** Session cookie: active first-pass wizard. Cleared on Save & exit / publish / explore. */
export const ONBOARDING_WIZARD_COOKIE = "salon_onboarding_wizard";

export const ONBOARDING_WIZARD_COOKIE_VALUE = "1";

export function wizardSessionCookieHeader(): string {
  const secure =
    process.env.NODE_ENV === "production" ? "; Secure" : "";
  // Session cookie: closing the browser ends the one-shot wizard.
  return `${ONBOARDING_WIZARD_COOKIE}=${ONBOARDING_WIZARD_COOKIE_VALUE}; Path=/; SameSite=Lax${secure}`;
}

export function clearWizardSessionCookieHeader(): string {
  const secure =
    process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${ONBOARDING_WIZARD_COOKIE}=; Path=/; SameSite=Lax; Max-Age=0${secure}`;
}

export function hasWizardSessionCookie(
  cookieHeader: string | null | undefined,
): boolean {
  if (!cookieHeader) return false;
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .some(
      (part) =>
        part === `${ONBOARDING_WIZARD_COOKIE}=${ONBOARDING_WIZARD_COOKIE_VALUE}`,
    );
}
