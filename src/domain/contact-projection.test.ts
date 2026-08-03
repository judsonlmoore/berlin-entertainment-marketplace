import { describe, expect, it } from "vitest";
import {
  projectContactMethods,
  selectPreferredContact,
} from "./contact-projection";

const methods = [
  {
    id: "c1",
    kind: "email" as const,
    value: "secret@example.com",
    isPreferred: true,
  },
  {
    id: "c2",
    kind: "phone" as const,
    value: "+493011111",
    isPreferred: false,
  },
];

describe("contact projection", () => {
  it("omits contact values when nothing is unlocked", () => {
    expect(projectContactMethods(methods, null)).toBeNull();
    expect(projectContactMethods(methods, [])).toBeNull();
  });

  it("reveals only the unlocked contact methods", () => {
    expect(projectContactMethods(methods, ["c1"])).toEqual([
      {
        id: "c1",
        kind: "email",
        value: "secret@example.com",
        isPreferred: true,
      },
    ]);
  });

  it("selects the preferred contact method", () => {
    expect(selectPreferredContact(methods)?.id).toBe("c1");
  });

  it("breaks ties deterministically by id", () => {
    expect(
      selectPreferredContact([
        { id: "b", kind: "email", value: "b@example.com", isPreferred: true },
        { id: "a", kind: "phone", value: "+49111", isPreferred: true },
      ])?.id,
    ).toBe("a");
  });
});
