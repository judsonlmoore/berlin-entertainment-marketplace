import { describe, expect, it } from "vitest";
import {
  canOwnerTransitionProfile,
  canStaffTransitionProfile,
  isProfileDiscoverable,
} from "./profile-publication";

describe("profile publication", () => {
  it("lets owners submit drafts and withdraw submissions", () => {
    expect(canOwnerTransitionProfile("draft", "submitted")).toBe(true);
    expect(canOwnerTransitionProfile("submitted", "draft")).toBe(true);
  });

  it("blocks owners from approving their own profiles", () => {
    expect(canOwnerTransitionProfile("submitted", "approved")).toBe(false);
  });

  it("lets staff approve, request changes, or suspend", () => {
    expect(canStaffTransitionProfile("submitted", "approved")).toBe(true);
    expect(canStaffTransitionProfile("submitted", "changes_requested")).toBe(
      true,
    );
    expect(canStaffTransitionProfile("approved", "suspended")).toBe(true);
  });

  it("only approved profiles are discoverable", () => {
    expect(isProfileDiscoverable("approved")).toBe(true);
    expect(isProfileDiscoverable("submitted")).toBe(false);
  });
});
