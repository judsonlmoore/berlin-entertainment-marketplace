import { describe, expect, it } from "vitest";
import { canTransitionApproval, hasMarketplaceAccess } from "./approval";

describe("approval transitions", () => {
  it("allows staff to approve an applied account", () => {
    expect(canTransitionApproval("applied", "approved")).toBe(true);
  });

  it("allows staff to suspend an approved account", () => {
    expect(canTransitionApproval("approved", "suspended")).toBe(true);
  });

  it("rejects no-op transitions", () => {
    expect(canTransitionApproval("approved", "approved")).toBe(false);
  });

  it("rejects unknown transitions such as invited to invited", () => {
    expect(canTransitionApproval("invited", "invited")).toBe(false);
  });
});

describe("marketplace access", () => {
  it("grants access only to approved accounts", () => {
    expect(hasMarketplaceAccess("approved")).toBe(true);
    expect(hasMarketplaceAccess("applied")).toBe(false);
    expect(hasMarketplaceAccess("invited")).toBe(false);
    expect(hasMarketplaceAccess("suspended")).toBe(false);
  });
});
