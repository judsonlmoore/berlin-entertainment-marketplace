import { describe, expect, it } from "vitest";
import {
  encodeSubcategory,
  encodeVenueType,
  parseSubcategory,
  parseVenueType,
} from "./profile-taxonomy";
import { parseLanguageCodes, serializeLanguageCodes, formatLanguageList } from "./languages";
import { joinSocialPrefix, validatePlatformUrl } from "./social-urls";
import {
  validateBerlinPostalCode,
  validateEmail,
  validateOptionalPhone,
} from "./field-validation";

describe("profile taxonomy", () => {
  it("encodes other subcategories", () => {
    expect(encodeSubcategory("other", "Theremin")).toBe("other:Theremin");
    expect(parseSubcategory("other:Theremin")).toEqual({
      subcategoryId: "other",
      otherLabel: "Theremin",
    });
  });

  it("round-trips venue type category paths", () => {
    const encoded = encodeVenueType("bar-club", "jazz-club");
    expect(parseVenueType(encoded)).toEqual({
      categoryId: "bar-club",
      subcategoryRaw: "jazz-club",
    });
  });
});

describe("languages", () => {
  it("serializes known language codes", () => {
    expect(serializeLanguageCodes(["de", "en", "xx"])).toBe("de,en");
    expect(parseLanguageCodes("de, en;fr")).toEqual(["de", "en", "fr"]);
  });

  it("formats codes as full localized names", () => {
    expect(formatLanguageList("de,en", "en")).toBe("German, English");
    expect(formatLanguageList("de,en", "de")).toBe("Deutsch, Englisch");
  });
});

describe("social urls", () => {
  it("validates platform hosts", () => {
    expect(
      validatePlatformUrl("instagram", "https://www.instagram.com/salon.berlin")
        .ok,
    ).toBe(true);
    expect(
      validatePlatformUrl("instagram", "https://twitter.com/salon").ok,
    ).toBe(false);
    expect(validatePlatformUrl("website", "https://drumson.live").ok).toBe(
      true,
    );
  });

  it("still joins legacy fragments", () => {
    expect(joinSocialPrefix("instagram", "salon.berlin")).toBe(
      "https://instagram.com/salon.berlin",
    );
  });
});

describe("field validation", () => {
  it("validates email phone and postal code", () => {
    expect(validateEmail("a@b.co").ok).toBe(true);
    expect(validateEmail("nope").ok).toBe(false);
    expect(validateOptionalPhone("").ok).toBe(true);
    expect(validateOptionalPhone("+49 30 1234567").ok).toBe(true);
    expect(validateBerlinPostalCode("10115").ok).toBe(true);
    expect(validateBerlinPostalCode("1011").ok).toBe(false);
  });
});
