import { describe, expect, it } from "vitest";
import {
  canViewDocumentVisibility,
  computeDocumentAccessFlags,
  filterDocumentsForViewer,
  isEngagementWindowOpen,
  normalizeDocumentTitle,
  resolveDocumentOwnerFromIds,
  titleFromFilename,
  validateProfileDocumentUpload,
  type ProfileDocumentAccessContext,
} from "./profile-document";

const ownerCtx: ProfileDocumentAccessContext = {
  isOwner: true,
  isStaff: false,
  canSeeMarketplace: false,
  canSeeEngagement: false,
};

const marketplaceViewer: ProfileDocumentAccessContext = {
  isOwner: false,
  isStaff: false,
  canSeeMarketplace: true,
  canSeeEngagement: false,
};

const engagementViewer: ProfileDocumentAccessContext = {
  isOwner: false,
  isStaff: false,
  canSeeMarketplace: false,
  canSeeEngagement: true,
};

const stranger: ProfileDocumentAccessContext = {
  isOwner: false,
  isStaff: false,
  canSeeMarketplace: false,
  canSeeEngagement: false,
};

describe("profile-document domain", () => {
  it("resolves XOR document owners and rejects both/neither", () => {
    expect(
      resolveDocumentOwnerFromIds({
        entertainerProfileId: "e1",
        venueId: null,
      }),
    ).toEqual({ kind: "entertainer", entertainerProfileId: "e1" });
    expect(
      resolveDocumentOwnerFromIds({
        entertainerProfileId: null,
        venueId: "v1",
      }),
    ).toEqual({ kind: "venue", venueId: "v1" });
    // Regression: venue-owned riders must not be treated as unowned.
    expect(
      resolveDocumentOwnerFromIds({
        entertainerProfileId: null,
        venueId: "v1",
      })?.kind,
    ).toBe("venue");
    expect(
      resolveDocumentOwnerFromIds({
        entertainerProfileId: null,
        venueId: null,
      }),
    ).toBeNull();
    expect(
      resolveDocumentOwnerFromIds({
        entertainerProfileId: "e1",
        venueId: "v1",
      }),
    ).toBeNull();
  });

  it("computes marketplace flags with discover.venues vs discover.entertainers gates", () => {
    const talentViewingApprovedVenue = computeDocumentAccessFlags({
      isOwner: false,
      isStaff: false,
      publicationState: "approved",
      canDiscoverMarketplace: true,
      hasOpenEngagement: false,
    });
    expect(talentViewingApprovedVenue.canSeeMarketplace).toBe(true);
    expect(talentViewingApprovedVenue.canSeeEngagement).toBe(false);

    const draftVenue = computeDocumentAccessFlags({
      isOwner: false,
      isStaff: false,
      publicationState: "draft",
      canDiscoverMarketplace: true,
      hasOpenEngagement: false,
    });
    expect(draftVenue.canSeeMarketplace).toBe(false);

    const noDiscover = computeDocumentAccessFlags({
      isOwner: false,
      isStaff: false,
      publicationState: "approved",
      canDiscoverMarketplace: false,
      hasOpenEngagement: false,
    });
    expect(noDiscover.canSeeMarketplace).toBe(false);

    const engaged = computeDocumentAccessFlags({
      isOwner: false,
      isStaff: false,
      publicationState: "approved",
      canDiscoverMarketplace: true,
      hasOpenEngagement: true,
    });
    expect(engaged.canSeeEngagement).toBe(true);

    expect(
      canViewDocumentVisibility("marketplace", talentViewingApprovedVenue),
    ).toBe(true);
    expect(
      canViewDocumentVisibility("engagement", talentViewingApprovedVenue),
    ).toBe(false);
    expect(canViewDocumentVisibility("engagement", engaged)).toBe(true);
  });

  it("allows empty title on upload and trims provided titles", () => {
    expect(
      validateProfileDocumentUpload({
        title: "  Tech rider  ",
        visibility: "marketplace",
        mimeType: "application/pdf",
        sizeBytes: 1024,
      }),
    ).toEqual({
      ok: true,
      title: "Tech rider",
      visibility: "marketplace",
    });
    expect(
      validateProfileDocumentUpload({
        title: "   ",
        visibility: "engagement",
        mimeType: "application/pdf",
        sizeBytes: 1024,
      }),
    ).toEqual({
      ok: true,
      title: "",
      visibility: "engagement",
    });
    expect(
      validateProfileDocumentUpload({
        title: "X",
        visibility: "nope",
        mimeType: "application/pdf",
        sizeBytes: 1024,
      }).ok,
    ).toBe(false);
    expect(
      validateProfileDocumentUpload({
        title: "X",
        visibility: "engagement",
        mimeType: "image/png",
        sizeBytes: 1024,
      }).ok,
    ).toBe(false);
  });

  it("derives a stable title from the uploaded filename when title is empty", () => {
    expect(titleFromFilename("Tech Rider — Electric.pdf")).toBe(
      "Tech Rider — Electric",
    );
    expect(titleFromFilename("notes.PDF")).toBe("notes");
    expect(titleFromFilename("")).toBe("PDF document");
  });

  it("normalizes title whitespace and length", () => {
    expect(normalizeDocumentTitle("  a   b  ")).toBe("a b");
  });

  it("gates visibility by access context", () => {
    expect(canViewDocumentVisibility("marketplace", ownerCtx)).toBe(true);
    expect(canViewDocumentVisibility("engagement", ownerCtx)).toBe(true);
    expect(canViewDocumentVisibility("marketplace", marketplaceViewer)).toBe(
      true,
    );
    expect(canViewDocumentVisibility("engagement", marketplaceViewer)).toBe(
      false,
    );
    expect(canViewDocumentVisibility("engagement", engagementViewer)).toBe(
      true,
    );
    expect(canViewDocumentVisibility("marketplace", engagementViewer)).toBe(
      false,
    );
    expect(canViewDocumentVisibility("marketplace", stranger)).toBe(false);
  });

  it("filters document lists for the viewer", () => {
    const docs = [
      { id: "1", visibility: "marketplace" },
      { id: "2", visibility: "engagement" },
    ];
    expect(
      filterDocumentsForViewer(docs, marketplaceViewer).map((d) => d.id),
    ).toEqual(["1"]);
    expect(
      filterDocumentsForViewer(docs, engagementViewer).map((d) => d.id),
    ).toEqual(["2"]);
    expect(filterDocumentsForViewer(docs, ownerCtx)).toHaveLength(2);
  });

  it("treats missing endsAt as open and past endsAt as closed", () => {
    const now = new Date("2026-08-06T12:00:00Z");
    expect(isEngagementWindowOpen({ now, endsAt: null })).toBe(true);
    expect(
      isEngagementWindowOpen({
        now,
        endsAt: new Date("2026-08-06T13:00:00Z"),
      }),
    ).toBe(true);
    expect(
      isEngagementWindowOpen({
        now,
        endsAt: new Date("2026-08-06T11:00:00Z"),
      }),
    ).toBe(false);
  });
});
