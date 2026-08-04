/**
 * Shared client/server field validators for profile builder forms.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** E.164-ish international; allows spaces/dashes/parens for entry comfort */
const PHONE_RE = /^\+?[0-9\s().-]{7,20}$/;
const DE_POSTAL_RE = /^\d{5}$/;

export type FieldValidation = { ok: true } | { ok: false; reason: string };

export function validateEmail(value: string): FieldValidation {
  const trimmed = value.trim();
  if (!trimmed) return { ok: false, reason: "Email is required" };
  if (trimmed.length > 320) return { ok: false, reason: "Email is too long" };
  if (!EMAIL_RE.test(trimmed)) {
    return { ok: false, reason: "Enter a valid email address" };
  }
  return { ok: true };
}

export function validateOptionalEmail(value: string): FieldValidation {
  if (!value.trim()) return { ok: true };
  return validateEmail(value);
}

export function validatePhone(value: string): FieldValidation {
  const trimmed = value.trim();
  if (!trimmed) return { ok: false, reason: "Phone number is required" };
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) {
    return { ok: false, reason: "Enter a valid phone number" };
  }
  if (!PHONE_RE.test(trimmed)) {
    return { ok: false, reason: "Enter a valid phone number" };
  }
  return { ok: true };
}

export function validateOptionalPhone(value: string): FieldValidation {
  if (!value.trim()) return { ok: true };
  return validatePhone(value);
}

export function validateHttpUrl(value: string): FieldValidation {
  const trimmed = value.trim();
  if (!trimmed) return { ok: false, reason: "URL is required" };
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return { ok: false, reason: "URL must start with http:// or https://" };
    }
    if (!parsed.hostname.includes(".")) {
      return { ok: false, reason: "Enter a valid website address" };
    }
  } catch {
    return { ok: false, reason: "Enter a valid URL" };
  }
  return { ok: true };
}

export function validateOptionalHttpUrl(value: string): FieldValidation {
  if (!value.trim()) return { ok: true };
  return validateHttpUrl(value);
}

export function validateBerlinPostalCode(value: string): FieldValidation {
  const trimmed = value.trim();
  if (!trimmed) return { ok: false, reason: "Postal code is required" };
  if (!DE_POSTAL_RE.test(trimmed)) {
    return { ok: false, reason: "Use a 5-digit German postal code" };
  }
  return { ok: true };
}

export function validateAddressLine(value: string): FieldValidation {
  const trimmed = value.trim();
  if (!trimmed) return { ok: false, reason: "Address is required" };
  if (trimmed.length < 3) {
    return { ok: false, reason: "Address is too short" };
  }
  if (trimmed.length > 200) {
    return { ok: false, reason: "Address is too long" };
  }
  return { ok: true };
}

export function validateDistrict(value: string): FieldValidation {
  const trimmed = value.trim();
  if (!trimmed) return { ok: false, reason: "District is required" };
  if (trimmed.length > 120) {
    return { ok: false, reason: "District is too long" };
  }
  return { ok: true };
}
