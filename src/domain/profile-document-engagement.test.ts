import { describe, expect, it } from "vitest";
import {
  canViewDocumentVisibility,
  computeDocumentAccessFlags,
  filterDocumentsForViewer,
} from "@/src/domain/profile-document";

describe("venue engagement document ACL (domain)", () => {
  it("allows engagement docs when talent has open engagement with venue", () => {
    const ctx = computeDocumentAccessFlags({
      isOwner: false,
      isStaff: false,
      publicationState: "approved",
      canDiscoverMarketplace: true,
      hasOpenEngagement: true,
    });
    expect(canViewDocumentVisibility("engagement", ctx)).toBe(true);
    expect(canViewDocumentVisibility("marketplace", ctx)).toBe(true);
  });

  it("hides engagement docs without open engagement", () => {
    const ctx = computeDocumentAccessFlags({
      isOwner: false,
      isStaff: false,
      publicationState: "approved",
      canDiscoverMarketplace: true,
      hasOpenEngagement: false,
    });
    expect(canViewDocumentVisibility("engagement", ctx)).toBe(false);
    expect(canViewDocumentVisibility("marketplace", ctx)).toBe(true);
  });

  it("filters document lists by visibility", () => {
    const ctx = computeDocumentAccessFlags({
      isOwner: false,
      isStaff: false,
      publicationState: "approved",
      canDiscoverMarketplace: true,
      hasOpenEngagement: true,
    });
    const docs = [
      { id: "1", visibility: "marketplace" as const },
      { id: "2", visibility: "engagement" as const },
    ];
    expect(filterDocumentsForViewer(docs, ctx).map((d) => d.id)).toEqual([
      "1",
      "2",
    ]);
  });
});
