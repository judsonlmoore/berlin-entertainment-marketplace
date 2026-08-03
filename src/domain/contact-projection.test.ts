import { describe, expect, it } from "vitest";
import {
  projectContactMethods,
  selectPreferredContact,
} from "./contact-projection";

const methods = [
  {
    id: "c1",
    kind: "email" as const,
    valueEncrypted: "secret@example.com",
    isPreferred: true,
  },
  {
    id: "c2",
    kind: "phone" as const,
    valueEncrypted: "+493011111",
    isPreferred: false,
  },
];

describe("contact projection", () => {
  it("omits contact values when not unlocked", () => {
    expect(projectContactMethods(methods, false)).toBeNull();
  });

  it("reveals contact values only when unlocked", () => {
    expect(projectContactMethods(methods, true)).toEqual([
      {
        id: "c1",
        kind: "email",
        value: "secret@example.com",
        isPreferred: true,
      },
      {
        id: "c2",
        kind: "phone",
        value: "+493011111",
        isPreferred: false,
      },
    ]);
  });

  it("selects the preferred contact method", () => {
    expect(selectPreferredContact(methods)?.id).toBe("c1");
  });
});
