import { describe, expect, it } from "vitest";
import {
  canOwnerPublishProfile,
  canOwnerTransitionProfile,
  canOwnerUnpublishProfile,
  canStaffTransitionProfile,
  isProfileDiscoverable,
} from "./profile-publication";

describe("profile publication", () => {
  it("lets owners self-publish drafts and unpublish live profiles", () => {
    expect(canOwnerTransitionProfile("draft", "approved")).toBe(true);
    expect(canOwnerTransitionProfile("approved", "draft")).toBe(true);
    expect(canOwnerPublishProfile("draft")).toBe(true);
    expect(canOwnerUnpublishProfile("approved")).toBe(true);
  });

  it("blocks owners from publishing while suspended", () => {
    expect(canOwnerPublishProfile("suspended")).toBe(false);
    expect(canOwnerTransitionProfile("suspended", "approved")).toBe(false);
  });

  it("lets staff suspend or restore publication", () => {
    expect(canStaffTransitionProfile("approved", "suspended")).toBe(true);
    expect(canStaffTransitionProfile("suspended", "approved")).toBe(true);
    expect(canStaffTransitionProfile("submitted", "changes_requested")).toBe(
      true,
    );
  });

  it("only approved profiles are discoverable", () => {
    expect(isProfileDiscoverable("approved")).toBe(true);
    expect(isProfileDiscoverable("draft")).toBe(false);
    expect(isProfileDiscoverable("submitted")).toBe(false);
  });
});
