import { describe, expect, it } from "vitest";
import { canTransitionAccountStatus, hasMarketplaceAccess } from "./approval";

describe("account status", () => {
  it("allows active to suspended and back", () => {
    expect(canTransitionAccountStatus("active", "suspended")).toBe(true);
    expect(canTransitionAccountStatus("suspended", "active")).toBe(true);
  });

  it("rejects no-op and invalid transitions", () => {
    expect(canTransitionAccountStatus("active", "active")).toBe(false);
    expect(canTransitionAccountStatus("suspended", "suspended")).toBe(false);
  });

  it("grants marketplace access only when active", () => {
    expect(hasMarketplaceAccess("active")).toBe(true);
    expect(hasMarketplaceAccess("suspended")).toBe(false);
  });
});
