import { describe, expect, it } from "vitest";
import { isUsableAvatarUrl } from "@/src/lib/avatar";

describe("isUsableAvatarUrl", () => {
  it("accepts absolute http(s) URLs", () => {
    expect(
      isUsableAvatarUrl("https://lh3.googleusercontent.com/a/example"),
    ).toBe(true);
    expect(isUsableAvatarUrl("https://avatars.githubusercontent.com/u/1")).toBe(
      true,
    );
    expect(isUsableAvatarUrl("http://localhost:3000/avatar.png")).toBe(true);
  });

  it("rejects missing, blank, or non-http values", () => {
    expect(isUsableAvatarUrl(null)).toBe(false);
    expect(isUsableAvatarUrl(undefined)).toBe(false);
    expect(isUsableAvatarUrl("")).toBe(false);
    expect(isUsableAvatarUrl("   ")).toBe(false);
    expect(isUsableAvatarUrl("/local-avatar.png")).toBe(false);
    expect(isUsableAvatarUrl("data:image/png;base64,abc")).toBe(false);
    expect(isUsableAvatarUrl("not a url")).toBe(false);
  });
});
