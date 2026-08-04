/**
 * Input sanitization for profile builder fields.
 * Blocks HTML/JS injection, URL insertion in free text, and obvious SQL payloads.
 */

const HTML_TAG_RE = /<\/?[a-z][\s\S]*>/i;
const SCRIPTISH_RE =
  /(javascript\s*:|data\s*:|vbscript\s*:|on\w+\s*=|<script|<iframe|<object|<embed)/i;
const URL_IN_TEXT_RE = /https?:\/\/|www\.\S+/i;
const SQLISH_RE =
  /(\b(union\s+select|drop\s+table|insert\s+into|delete\s+from|update\s+\w+\s+set|or\s+1\s*=\s*1|--|\/\*|\*\/|;--)\b)/i;

export type SanitizeResult =
  { ok: true; value: string } | { ok: false; reason: string };

export function containsDisallowedMarkup(value: string): boolean {
  return HTML_TAG_RE.test(value) || SCRIPTISH_RE.test(value);
}

export function containsUrl(value: string): boolean {
  return URL_IN_TEXT_RE.test(value);
}

export function containsSqliPattern(value: string): boolean {
  return SQLISH_RE.test(value);
}

/** Plain-text profile fields: no HTML, scripts, URLs, or SQL payloads. */
export function sanitizePlainText(
  value: string,
  options?: { allowEmpty?: boolean; max?: number; min?: number },
): SanitizeResult {
  const trimmed = value.trim();
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
  if (containsDisallowedMarkup(trimmed) || SCRIPTISH_RE.test(trimmed)) {
    return { ok: false, reason: "HTML or script content is not allowed" };
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

export function validateRichTextField(
  html: string,
  options: { min: number; max: number },
): SanitizeResult {
  if (SCRIPTISH_RE.test(html) || /https?:\/\//i.test(html)) {
    return {
      ok: false,
      reason: "Links and scripts are not allowed in this field",
    };
  }
  const clean = sanitizeRichTextHtml(html);
  const length = richTextPlainLength(clean);
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
