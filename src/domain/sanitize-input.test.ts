import { describe, expect, it } from "vitest";
import {
  DESCRIPTION_MAX,
  richTextToPlain,
  sanitizePlainText,
  sanitizeRichTextHtml,
  validateRichTextField,
} from "./sanitize-input";

describe("sanitizePlainText", () => {
  it("strips pasted html to plain text instead of rejecting", () => {
    const result = sanitizePlainText("<p>Hello <strong>act</strong></p>");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe("Hello act");
  });

  it("rejects script urls and sqli-ish payloads", () => {
    expect(sanitizePlainText("Hello act").ok).toBe(true);
    expect(sanitizePlainText('<img src=x onerror="alert(1)">').ok).toBe(false);
    expect(sanitizePlainText("see https://evil.test").ok).toBe(false);
    expect(sanitizePlainText("x'; DROP TABLE users; --").ok).toBe(false);
  });

  it("does not false-positive on ordinary phrases like once =", () => {
    expect(sanitizePlainText("We play once = Friday").ok).toBe(true);
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

  it("allows empty rich text when min is 0", () => {
    const empty = validateRichTextField("<p></p>", {
      min: 0,
      max: DESCRIPTION_MAX,
      allowEmpty: true,
    });
    expect(empty.ok).toBe(true);
    if (empty.ok) expect(empty.value).toBe("");
  });

  it("accepts allowlisted markup and ordinary equals phrases", () => {
    const formatted = validateRichTextField(
      "<p>We play <strong>once = Friday</strong> with a list:</p><ul><li>PA</li></ul>",
      { min: 10, max: DESCRIPTION_MAX },
    );
    expect(formatted.ok).toBe(true);
  });

  it("strips tags for plain preview", () => {
    expect(richTextToPlain("<p>Hello <strong>world</strong></p>")).toBe(
      "Hello world",
    );
  });
});
