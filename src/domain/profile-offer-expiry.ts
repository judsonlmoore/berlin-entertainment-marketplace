/** Pending profile offers expire this many days after send if unanswered. */
export const PROFILE_OFFER_EXPIRY_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export function profileOfferExpiresAt(
  sentAt: Date,
  expiryDays = PROFILE_OFFER_EXPIRY_DAYS,
): Date {
  return new Date(sentAt.getTime() + expiryDays * DAY_MS);
}

export function isProfileOfferExpired(
  sentAt: Date,
  now = new Date(),
  expiryDays = PROFILE_OFFER_EXPIRY_DAYS,
): boolean {
  return profileOfferExpiresAt(sentAt, expiryDays) <= now;
}

/** Whole days left until expiry (at least 1 while still open). */
export function profileOfferDaysRemaining(
  sentAt: Date,
  now = new Date(),
  expiryDays = PROFILE_OFFER_EXPIRY_DAYS,
): number {
  const until = profileOfferExpiresAt(sentAt, expiryDays);
  if (until <= now) return 0;
  return Math.max(1, Math.ceil((until.getTime() - now.getTime()) / DAY_MS));
}
