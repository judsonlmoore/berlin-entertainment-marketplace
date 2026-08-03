import { describe, expect, it } from "vitest";
import de from "../../messages/de.json";
import en from "../../messages/en.json";

function leafPaths(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) {
    return [prefix];
  }

  return Object.entries(value).flatMap(([key, child]) =>
    leafPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("locale catalogs", () => {
  it("keeps English and German keys in parity", () => {
    expect(leafPaths(de).sort()).toEqual(leafPaths(en).sort());
  });
});
