/**
 * Input sanitization for profile builder fields.
 * Blocks HTML/JS injection, URL insertion in free text, and obvious SQL payloads.
 */

/** True script / event-handler vectors — avoid false positives like "once =". */
const SCRIPTISH_RE =
  /(javascript\s*:|data\s*:text\/html|vbscript\s*:|<script\b|<iframe\b|<object\b|<embed\b|\bon[a-z]+\s*=\s*["'])/i;
const URL_IN_TEXT_RE = /https?:\/\/|www\.\S+/i;
const SQLISH_RE =
  /(\b(union\s+select|drop\s+table|insert\s+into|delete\s+from|update\s+\w+\s+set|or\s+1\s*=\s*1|--|\/\*|\*\/|;--)\b)/i;

export type SanitizeResult =
  { ok: true; value: string } | { ok: false; reason: string };

/** Strip tags so pasted rich text becomes plain text in single-line fields. */
export function stripHtmlToPlain(value: string): string {
  return value
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*p\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function containsDisallowedMarkup(value: string): boolean {
  return SCRIPTISH_RE.test(value) || /<\/?[a-z][\s\S]*>/i.test(value);
}

export function containsUrl(value: string): boolean {
  return URL_IN_TEXT_RE.test(value);
}

export function containsSqliPattern(value: string): boolean {
  return SQLISH_RE.test(value);
}

/**
 * Plain-text profile fields (names, locations, etc.).
 * Pasted HTML is stripped to text; real script vectors and URLs are rejected.
 */
export function sanitizePlainText(
  value: string,
  options?: { allowEmpty?: boolean; max?: number; min?: number },
): SanitizeResult {
  // Reject script vectors on the raw input before stripping tags.
  if (SCRIPTISH_RE.test(value)) {
    return { ok: false, reason: "HTML or script content is not allowed" };
  }
  // Plain fields never store markup — strip tags from paste/copy.
  const trimmed = stripHtmlToPlain(value);
  if (!trimmed) {
    if (options?.allowEmpty) return { ok: true, value: "" };
    return { ok: false, reason: "This field is required" };
  }
  if (options?.min && trimmed.length < options.min) {
    return {
      ok: false,
      reason: `Enter at least ${options.min} characters`,
    };
  }
  if (options?.max && trimmed.length > options.max) {
    return {
      ok: false,
      reason: `Keep this under ${options.max} characters`,
    };
  }
  if (containsUrl(trimmed)) {
    return { ok: false, reason: "URLs are not allowed in this field" };
  }
  if (containsSqliPattern(trimmed)) {
    return { ok: false, reason: "Invalid characters in this field" };
  }
  return { ok: true, value: trimmed };
}

const ALLOWED_RICH_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "ul",
  "ol",
  "li",
  "blockquote",
]);

/**
 * Strip to an allowlist of formatting tags. Removes attributes and disallowed nodes.
 */
export function sanitizeRichTextHtml(html: string): string {
  const withoutComments = html.replace(/<!--[\s\S]*?-->/g, "");
  // Remove disallowed tags but keep their text content.
  const stripped = withoutComments.replace(
    /<\/?([a-z0-9]+)(\s[^>]*)?>/gi,
    (match, tagName: string) => {
      const tag = tagName.toLowerCase();
      if (!ALLOWED_RICH_TAGS.has(tag)) return "";
      if (match.startsWith("</")) return `</${tag}>`;
      if (tag === "br") return "<br>";
      return `<${tag}>`;
    },
  );
  return stripped
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .replace(/(<p>\s*<\/p>)+/g, "")
    .trim();
}

export function richTextPlainLength(html: string): number {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim().length;
}

/** Strip tags for card previews and plain-text length checks. */
export function richTextToPlain(html: string): string {
  return stripHtmlToPlain(html);
}

export function validateRichTextField(
  html: string,
  options: { min: number; max: number; allowEmpty?: boolean },
): SanitizeResult {
  // Check script vectors on the raw input, then allowlist-sanitize tags.
  if (SCRIPTISH_RE.test(html)) {
    return {
      ok: false,
      reason: "Links and scripts are not allowed in this field",
    };
  }
  // Reject raw pasted URLs in prose (links belong in the dedicated URL fields).
  const plainProbe = stripHtmlToPlain(html);
  if (URL_IN_TEXT_RE.test(plainProbe)) {
    return {
      ok: false,
      reason: "Links and scripts are not allowed in this field",
    };
  }
  const clean = sanitizeRichTextHtml(html);
  const length = richTextPlainLength(clean);
  if (length === 0) {
    if (options.allowEmpty || options.min === 0) {
      return { ok: true, value: "" };
    }
    return { ok: false, reason: "This field is required" };
  }
  if (length < options.min) {
    return {
      ok: false,
      reason: `Enter at least ${options.min} characters`,
    };
  }
  if (length > options.max) {
    return {
      ok: false,
      reason: `Keep this under ${options.max} characters`,
    };
  }
  const plain = clean.replace(/<[^>]+>/g, " ");
  if (containsSqliPattern(plain)) {
    return { ok: false, reason: "Invalid characters in this field" };
  }
  return { ok: true, value: clean };
}

export const DESCRIPTION_MIN = 40;
export const DESCRIPTION_MAX = 2000;
export const TECHNICAL_MIN = 10;
export const TECHNICAL_MAX = 2000;
/** Optional prose notes (accessibility, equipment, house rules, etc.). */
export const NOTES_MAX = 2000;
export const SHORT_DESCRIPTION_MAX = 500;
export const LONG_NOTES_MAX = 4000;
