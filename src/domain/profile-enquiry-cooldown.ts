/** After any contact request for an act↔venue pair, block a new one for this long. */
export const PROFILE_ENQUIRY_REQUEST_COOLDOWN_DAYS = 7;

/** After Pass, a longer block before either side can re-open undated contact. */
export const PROFILE_ENQUIRY_PASS_COOLDOWN_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export function enquiryRequestCooldownUntil(
  requestedAt: Date,
  cooldownDays = PROFILE_ENQUIRY_REQUEST_COOLDOWN_DAYS,
): Date {
  return new Date(requestedAt.getTime() + cooldownDays * DAY_MS);
}

export function isEnquiryRequestOnCooldown(
  requestedAt: Date,
  now = new Date(),
  cooldownDays = PROFILE_ENQUIRY_REQUEST_COOLDOWN_DAYS,
): boolean {
  return enquiryRequestCooldownUntil(requestedAt, cooldownDays) > now;
}

/** Whole days left until cooldown ends (at least 1 while still on cooldown). */
export function enquiryRequestCooldownDaysRemaining(
  requestedAt: Date,
  now = new Date(),
  cooldownDays = PROFILE_ENQUIRY_REQUEST_COOLDOWN_DAYS,
): number {
  const until = enquiryRequestCooldownUntil(requestedAt, cooldownDays);
  if (until <= now) return 0;
  return Math.max(1, Math.ceil((until.getTime() - now.getTime()) / DAY_MS));
}
