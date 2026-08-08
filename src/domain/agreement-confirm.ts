/**
 * Locale confirmation phrases for agreement double opt-in.
 */
export const AGREEMENT_CONFIRMATION_PHRASES = {
  en: "I agree",
  de: "Ich stimme zu",
} as const;

export type AgreementConfirmLocale =
  keyof typeof AGREEMENT_CONFIRMATION_PHRASES;

export function expectedConfirmationPhrase(
  locale: AgreementConfirmLocale,
): string {
  return AGREEMENT_CONFIRMATION_PHRASES[locale];
}

export function matchesConfirmationPhrase(
  typed: string,
  locale: AgreementConfirmLocale,
): boolean {
  const expected = expectedConfirmationPhrase(locale);
  return typed.trim().toLocaleLowerCase() === expected.toLocaleLowerCase();
}
