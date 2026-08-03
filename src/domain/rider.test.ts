import { describe, expect, it } from "vitest";
import {
  isAllowedRiderMime,
  isPrivateRiderKey,
  sanitizeRiderFilename,
  validateRiderUploadInput,
} from "./rider";

describe("rider domain", () => {
  it("allows PDF only", () => {
    expect(isAllowedRiderMime("application/pdf")).toBe(true);
    expect(isAllowedRiderMime("image/png")).toBe(false);
  });

  it("validates checksum and size", () => {
    expect(
      validateRiderUploadInput({
        mimeType: "application/pdf",
        sizeBytes: 1024,
        checksum: "a".repeat(64),
      }).ok,
    ).toBe(true);
    expect(
      validateRiderUploadInput({
        mimeType: "application/pdf",
        sizeBytes: 20 * 1024 * 1024,
        checksum: "a".repeat(64),
      }).ok,
    ).toBe(false);
  });

  it("keeps rider keys private-looking", () => {
    expect(isPrivateRiderKey("sandbox/user/file.pdf")).toBe(true);
    expect(isPrivateRiderKey("https://public.example/file.pdf")).toBe(false);
  });

  it("sanitizes rider filenames", () => {
    expect(sanitizeRiderFilename("../../evil.pdf")).toBe("evil.pdf");
    expect(sanitizeRiderFilename("my rider (final).pdf")).toBe(
      "my rider (final).pdf",
    );
  });
});
