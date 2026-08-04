import { describe, expect, it } from "vitest";
import {
  DESCRIPTION_MAX,
  sanitizePlainText,
  sanitizeRichTextHtml,
  validateRichTextField,
} from "./sanitize-input";

describe("sanitizePlainText", () => {
  it("rejects html urls and sqli-ish payloads", () => {
    expect(sanitizePlainText("Hello act").ok).toBe(true);
    expect(sanitizePlainText("<script>alert(1)</script>").ok).toBe(false);
    expect(sanitizePlainText("see https://evil.test").ok).toBe(false);
    expect(sanitizePlainText("x'; DROP TABLE users; --").ok).toBe(false);
  });
});

describe("rich text sanitize", () => {
  it("keeps allowlisted formatting and enforces length", () => {
    const html = sanitizeRichTextHtml(
      '<p>Hello <strong>world</strong><script>x</script></p><a href="https://x.test">no</a>',
    );
    expect(html).toContain("<strong>");
    expect(html).not.toContain("script");
    expect(html).not.toContain("<a");

    const ok = validateRichTextField(`<p>${"a".repeat(DESCRIPTION_MAX)}</p>`, {
      min: 40,
      max: DESCRIPTION_MAX,
    });
    expect(ok.ok).toBe(true);

    const tooShort = validateRichTextField("<p>short</p>", {
      min: 40,
      max: DESCRIPTION_MAX,
    });
    expect(tooShort.ok).toBe(false);
  });
});
